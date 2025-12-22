# Module 4: Invoices

> **Prerequisite**: Complete Module 3 (Dashboard) first

This module implements invoice creation, listing, and payment link sharing.

---

## 4.1 Create Validation Schema

Create `lib/validations.ts`:

```typescript
import { z } from 'zod';

export const createInvoiceSchema = z.object({
  clientEmail: z.string().email('Invalid email address'),
  clientName: z.string().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive').max(100000),
  dueDate: z.string().optional(),
  sendEmail: z.boolean().optional().default(false),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
```

---

## 4.2 Create Invoices API

### List & Create Invoices
Create `app/api/invoices/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';
import { createInvoiceSchema } from '@/lib/validations';
import { generateInvoiceNumber } from '@/lib/utils';

// GET /api/invoices - List user's invoices
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claims = await verifyAuthToken(authToken);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyId: claims.userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const status = request.nextUrl.searchParams.get('status');
  
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ invoices });
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claims = await verifyAuthToken(authToken);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyId: claims.userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { clientEmail, clientName, description, amount, dueDate } = parsed.data;
  
  const invoiceNumber = generateInvoiceNumber();
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceNumber}`;

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber,
      clientEmail,
      clientName,
      description,
      amount,
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentLink,
    },
  });

  // TODO: Send email if sendEmail is true

  return NextResponse.json(invoice, { status: 201 });
}
```

### Single Invoice Operations
Create `app/api/invoices/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claims = await verifyAuthToken(authToken);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyId: claims.userId },
  });

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      userId: user?.id,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

// DELETE /api/invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claims = await verifyAuthToken(authToken);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyId: claims.userId },
  });

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      userId: user?.id,
      status: 'pending', // Can only delete pending invoices
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found or cannot be deleted' }, { status: 404 });
  }

  await prisma.invoice.update({
    where: { id: params.id },
    data: { status: 'cancelled' },
  });

  return NextResponse.json({ success: true });
}
```

---

## 4.3 Create Invoice Components

### Invoice Form
Create `components/invoices/InvoiceForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

export function InvoiceForm() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    clientEmail: '',
    clientName: '',
    description: '',
    amount: '',
    dueDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      const invoice = await res.json();
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-brand-black mb-2">
            Client Email *
          </label>
          <input
            type="email"
            name="clientEmail"
            value={formData.clientEmail}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg border border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none"
            placeholder="client@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-black mb-2">
            Client Name
          </label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none"
            placeholder="John Smith"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-black mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none resize-none"
          placeholder="Logo design, website development, etc."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-brand-black mb-2">
            Amount (USD) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray">$</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="1"
              step="0.01"
              className="w-full pl-8 pr-4 py-3 rounded-lg border border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-black mb-2">
            Due Date
          </label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black outline-none"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 px-4 bg-brand-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Invoice'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-brand-border rounded-lg font-medium hover:bg-brand-light transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

### Invoice Card
Create `components/invoices/InvoiceCard.tsx`:

```tsx
import Link from 'next/link';
import { FileText, Copy, ExternalLink } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientEmail: string;
  description: string;
  amount: number;
  status: string;
  paymentLink: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
};

export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const copyPaymentLink = () => {
    navigator.clipboard.writeText(invoice.paymentLink);
    alert('Payment link copied!');
  };

  return (
    <div className="bg-white rounded-xl border border-brand-border p-4 hover:border-brand-black/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-light rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-brand-gray" />
          </div>
          <div>
            <p className="font-medium text-brand-black">{invoice.invoiceNumber}</p>
            <p className="text-sm text-brand-gray">{invoice.clientEmail}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>
      
      <p className="text-sm text-brand-gray mb-3 line-clamp-2">{invoice.description}</p>
      
      <div className="flex items-center justify-between">
        <p className="text-xl font-bold text-brand-black">
          ${Number(invoice.amount).toFixed(2)}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={copyPaymentLink}
            className="p-2 text-brand-gray hover:text-brand-black hover:bg-brand-light rounded-lg transition-colors"
            title="Copy payment link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="p-2 text-brand-gray hover:text-brand-black hover:bg-brand-light rounded-lg transition-colors"
            title="View details"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## 4.4 Create Invoice Pages

### Invoice List Page
Update `app/(dashboard)/dashboard/invoices/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { InvoiceCard } from '@/components/invoices/InvoiceCard';

export default function InvoicesPage() {
  const { getAccessToken } = usePrivy();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/invoices', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoices();
  }, [getAccessToken]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Invoices</h1>
          <p className="text-brand-gray">Manage your invoices and payment links</p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-brand-border p-4 animate-pulse">
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-brand-border">
          <p className="text-brand-gray mb-2">No invoices yet</p>
          <Link href="/dashboard/invoices/new" className="text-brand-black underline">
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoices.map((invoice: any) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### New Invoice Page
Create `app/(dashboard)/dashboard/invoices/new/page.tsx`:

```tsx
import { InvoiceForm } from '@/components/invoices/InvoiceForm';

export default function NewInvoicePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-black">Create Invoice</h1>
        <p className="text-brand-gray">Create a new invoice and share the payment link</p>
      </div>

      <div className="bg-white rounded-xl border border-brand-border p-6">
        <InvoiceForm />
      </div>
    </div>
  );
}
```

### Invoice Detail Page
Create `app/(dashboard)/dashboard/invoices/[id]/page.tsx`:

```tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { Copy, ExternalLink } from 'lucide-react';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { getAccessToken } = usePrivy();
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/invoices/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setInvoice(await res.json());
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoice();
  }, [params.id, getAccessToken]);

  const copyLink = () => {
    navigator.clipboard.writeText(invoice.paymentLink);
    alert('Copied!');
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-brand-border p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-black">{invoice.invoiceNumber}</h1>
            <p className="text-brand-gray">{invoice.clientEmail}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>

        <div className="border-t border-brand-border pt-4 mb-4">
          <p className="text-brand-gray mb-2">{invoice.description}</p>
          <p className="text-3xl font-bold text-brand-black">${Number(invoice.amount).toFixed(2)}</p>
        </div>

        <div className="bg-brand-light rounded-lg p-4">
          <p className="text-sm text-brand-gray mb-2">Payment Link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={invoice.paymentLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-brand-border rounded-lg text-sm"
            />
            <button
              onClick={copyLink}
              className="p-2 bg-brand-black text-white rounded-lg hover:bg-gray-800"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={invoice.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-brand-border rounded-lg hover:bg-brand-light"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Verification Checklist

Before moving to Module 5:

- [ ] Can create new invoice via form
- [ ] Invoice list displays correctly
- [ ] Invoice detail page shows all info
- [ ] Payment link can be copied
- [ ] Invoices persist in database (check Prisma Studio)
- [ ] Status badges display correctly
- [ ] Empty state shows when no invoices

---

**Next Module**: [05-payments-module.md](./05-payments-module.md) - Public payment page
