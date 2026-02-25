import { NextRequest, NextResponse } from "next/server";
import { submitKYCData } from "@/lib/sep12-kyc";
import { getAuthContext } from "@/app/api/routes-d/auto-swap/_shared";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger'

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

    if (!isKycRateLimitBypassed(auth.user.id)) {
      const globalCheck = kycSubmitGlobal.check("global");
      if (!globalCheck.allowed) {
        console.warn("[rate-limit] KYC submit global limit exceeded", {
          ip: getClientIp(req),
        });
        return buildRateLimitResponse(globalCheck);
      }

      const hourlyCheck = kycSubmitHourly.check(auth.user.id);
      if (!hourlyCheck.allowed) {
        console.warn("[rate-limit] KYC submit hourly limit exceeded", {
          userId: auth.user.id,
          ip: getClientIp(req),
        });
        return buildRateLimitResponse(hourlyCheck);
      }

      const dailyCheck = kycSubmitDaily.check(auth.user.id);
      if (!dailyCheck.allowed) {
        console.warn("[rate-limit] KYC submit daily limit exceeded", {
          userId: auth.user.id,
          ip: getClientIp(req),
        });
        return buildRateLimitResponse(dailyCheck);
      }
    }

    // Derive stellarAddress from the authenticated user's wallet — never trust headers
    const wallet = await prisma.wallet.findUnique({
      where: { userId: auth.user.id },
      select: { address: true },
    });

    if (!wallet?.address) {
      return NextResponse.json(
        { error: "No Stellar wallet found for this account" },
        { status: 404 }
      );
    }

    const stellarAddress = wallet.address;
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
    logger.error("Error submitting KYC data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit KYC data" },
      { status: 500 }
    );
  }
}
