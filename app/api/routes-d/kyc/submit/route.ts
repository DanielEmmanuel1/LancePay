import { NextRequest, NextResponse } from "next/server";
import { submitKYCData } from "@/lib/sep12-kyc";
import { getAuthContext } from "@/app/api/routes-d/auto-swap/_shared";
import { prisma } from "@/lib/db";

const MAX_FILE_COUNT = 6;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);
const CLOUDINARY_HOST_SUFFIX = "res.cloudinary.com";

const DOCUMENT_FIELDS = [
  "photo_id_front",
  "photo_id_back",
  "photo_proof_residence",
  "photo_selfie",
  "photo_additional_1",
  "photo_additional_2",
] as const;

type DocumentField = (typeof DOCUMENT_FIELDS)[number];

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

function isDocumentField(value: string): value is DocumentField {
  return (DOCUMENT_FIELDS as readonly string[]).includes(value);
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalIdType(
  value: unknown
): "passport" | "drivers_license" | "national_id" | undefined {
  if (value === "passport") return "passport";
  if (value === "drivers_license") return "drivers_license";
  if (value === "national_id") return "national_id";
  return undefined;
}

function inferMimeFromPathname(pathname: string): string | undefined {
  const extension = pathname.split(".").pop()?.toLowerCase();
  if (!extension) return undefined;
  return MIME_BY_EXTENSION[extension];
}

function inferExtensionFromMimeType(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

function validateDocumentFile(file: File, field: DocumentField): void {
  if (file.size <= 0) {
    throw new BadRequestError(`Document ${field} is empty`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(`Document ${field} exceeds the 25MB limit`);
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new BadRequestError(
      `Document ${field} must be JPEG, PNG, or PDF (received ${file.type})`
    );
  }
}

async function toValidatedFileFromUrl(
  value: string,
  field: DocumentField
): Promise<File> {
  let documentUrl: URL;
  try {
    documentUrl = new URL(value);
  } catch {
    throw new BadRequestError(`Document URL for ${field} is invalid`);
  }

  if (documentUrl.protocol !== "https:") {
    throw new BadRequestError(`Document URL for ${field} must use HTTPS`);
  }

  if (!documentUrl.hostname.endsWith(CLOUDINARY_HOST_SUFFIX)) {
    throw new BadRequestError(
      `Document URL for ${field} must come from Cloudinary storage`
    );
  }

  const response = await fetch(documentUrl.toString());
  if (!response.ok) {
    throw new BadRequestError(
      `Unable to download uploaded document for ${field}`
    );
  }

  const blob = await response.blob();
  const derivedMimeType = blob.type || inferMimeFromPathname(documentUrl.pathname);
  if (!derivedMimeType || !ALLOWED_MIME_TYPES.has(derivedMimeType)) {
    throw new BadRequestError(`Document URL for ${field} has unsupported format`);
  }

  const extension = inferExtensionFromMimeType(derivedMimeType);
  const file = new File([blob], `${field}.${extension}`, {
    type: derivedMimeType,
  });
  validateDocumentFile(file, field);
  return file;
}

async function resolveDocumentFromFormData(
  formData: FormData,
  field: DocumentField
): Promise<File | undefined> {
  const rawValue = formData.get(field);
  if (rawValue instanceof File && rawValue.size > 0) {
    validateDocumentFile(rawValue, field);
    return rawValue;
  }

  const rawUrlValue = parseOptionalString(rawValue);
  if (rawUrlValue) {
    return toValidatedFileFromUrl(rawUrlValue, field);
  }

  const explicitUrl = parseOptionalString(formData.get(`${field}_url`));
  if (explicitUrl) {
    return toValidatedFileFromUrl(explicitUrl, field);
  }

  return undefined;
}

/**
 * POST /api/kyc/submit
 * Submit KYC information to SEP-12 anchor
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const authToken = req.headers.get("x-sep10-token");
    if (!authToken) {
      return NextResponse.json(
        { error: "SEP-10 auth token required" },
        { status: 400 }
      );
    }

    // Derive stellarAddress from the authenticated user's wallet — never trust headers
    const wallet = await prisma.wallet.findUnique({
      where: { userId: auth.user.id },
      select: { stellarAddress: true },
    });

    if (!wallet?.stellarAddress) {
      return NextResponse.json(
        { error: "No Stellar wallet found for this account" },
        { status: 404 }
      );
    }

    const stellarAddress = wallet.stellarAddress;
    const contentType = req.headers.get("content-type") || "";

    let first_name: string | undefined;
    let last_name: string | undefined;
    let email_address: string | undefined;
    let phone_number: string | undefined;
    let address_country_code: string | undefined;
    let address_city: string | undefined;
    let address_line_1: string | undefined;
    let birth_date: string | undefined;
    let id_type: "passport" | "drivers_license" | "national_id" | undefined;
    let id_number: string | undefined;

    const documentFiles: Partial<Record<DocumentField, File>> = {};

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      first_name = parseOptionalString(body.first_name);
      last_name = parseOptionalString(body.last_name);
      email_address = parseOptionalString(body.email_address);
      phone_number = parseOptionalString(body.phone_number);
      address_country_code = parseOptionalString(body.address_country_code);
      address_city = parseOptionalString(body.address_city);
      address_line_1 = parseOptionalString(body.address_line_1);
      birth_date = parseOptionalString(body.birth_date);
      id_type = parseOptionalIdType(body.id_type);
      id_number = parseOptionalString(body.id_number);

      const rawDocuments = body.documents;
      if (rawDocuments && typeof rawDocuments === "object") {
        for (const [key, rawUrl] of Object.entries(
          rawDocuments as Record<string, unknown>
        )) {
          if (!isDocumentField(key)) continue;
          const documentUrl = parseOptionalString(rawUrl);
          if (!documentUrl) continue;
          documentFiles[key] = await toValidatedFileFromUrl(documentUrl, key);
        }
      }
    } else {
      const formData = await req.formData();
      first_name = parseOptionalString(formData.get("first_name"));
      last_name = parseOptionalString(formData.get("last_name"));
      email_address = parseOptionalString(formData.get("email_address"));
      phone_number = parseOptionalString(formData.get("phone_number"));
      address_country_code = parseOptionalString(
        formData.get("address_country_code")
      );
      address_city = parseOptionalString(formData.get("address_city"));
      address_line_1 = parseOptionalString(formData.get("address_line_1"));
      birth_date = parseOptionalString(formData.get("birth_date"));
      id_type = parseOptionalIdType(parseOptionalString(formData.get("id_type")));
      id_number = parseOptionalString(formData.get("id_number"));

      for (const field of DOCUMENT_FIELDS) {
        const resolved = await resolveDocumentFromFormData(formData, field);
        if (resolved) {
          documentFiles[field] = resolved;
        }
      }
    }

    const uploadedDocumentCount = Object.keys(documentFiles).length;
    if (uploadedDocumentCount > MAX_FILE_COUNT) {
      throw new BadRequestError("Maximum of 6 KYC documents can be uploaded");
    }

    const missingFields: string[] = [];
    if (!first_name) missingFields.push("first_name");
    if (!last_name) missingFields.push("last_name");
    if (!email_address) missingFields.push("email_address");
    if (!address_country_code) missingFields.push("address_country_code");
    if (missingFields.length > 0) {
      throw new BadRequestError(
        `Missing required KYC fields: ${missingFields.join(", ")}`
      );
    }
    if (!first_name || !last_name || !email_address || !address_country_code) {
      throw new BadRequestError("Missing required KYC fields");
    }

    const requiredFirstName = first_name;
    const requiredLastName = last_name;
    const requiredEmailAddress = email_address;
    const requiredCountryCode = address_country_code;

    const kycData = {
      first_name: requiredFirstName,
      last_name: requiredLastName,
      email_address: requiredEmailAddress,
      phone_number,
      address_country_code: requiredCountryCode,
      address_city,
      address_line_1,
      birth_date,
      id_type,
      id_number,
      photo_id_front: documentFiles.photo_id_front,
      photo_id_back: documentFiles.photo_id_back,
      photo_proof_residence: documentFiles.photo_proof_residence,
    };

    const result = await submitKYCData(stellarAddress, authToken, kycData);

    return NextResponse.json({
      success: true,
      data: result,
      uploadedDocumentCount,
    });
  } catch (error: any) {
    if (error?.name === "BadRequestError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error submitting KYC data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit KYC data" },
      { status: 500 }
    );
  }
}
