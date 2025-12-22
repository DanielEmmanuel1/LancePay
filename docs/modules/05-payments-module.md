# Module 5: Public Payment Page

> **Prerequisite**: Complete Module 4 (Invoices) first

This module implements the public payment page where clients pay invoices.

---

## 5.1 Create Payment API Route

Create `app/api/pay/[invoiceId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get invoice for payment (public, no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: params.invoiceId },
    include: {
      user: { select: { name: true, wallet: { select: { address: true } } } }
    }
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json({
    invoiceNumber: invoice.invoiceNumber,
    freelancerName: invoice.user.name || 'Freelancer',
    description: invoice.description,
    amount: Number(invoice.amount),
    status: invoice.status,
    dueDate: invoice.dueDate,
  });
}

// POST - Mark invoice as paid (MVP mock)
export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: params.invoiceId },
  });

  if (!invoice || invoice.status !== 'pending') {
    return NextResponse.json({ error: 'Invalid invoice' }, { status: 400 });
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'paid', paidAt: new Date() },
  });

  await prisma.transaction.create({
    data: {
      userId: invoice.userId,
      type: 'incoming',
      status: 'completed',
      amount: invoice.amount,
      currency: invoice.currency,
      invoiceId: invoice.id,
    },
  });

  return NextResponse.json({ success: true });
}
```

---

## 5.2 Create Payment Page

Create `app/pay/[invoiceId]/page.tsx` - see full code in implementation.

Key elements:
- Fetch invoice data on load
- Display freelancer name, description, amount
- "Pay" button triggers mock payment
- Success/error states

---

## Verification Checklist

- [ ] Payment page loads with invoice details
- [ ] "Pay" button works (mock payment)
- [ ] Invoice status updates to "paid"
- [ ] Transaction record created

---

**Next Module**: [06-withdrawals-module.md](./06-withdrawals-module.md)
