# Module 6: Bank Withdrawals

> **Prerequisite**: Complete Module 5 (Payments) first

This module implements bank account management and withdrawals to Nigerian banks.

---

## 6.1 Bank Accounts API

Create `app/api/bank-accounts/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// Nigerian banks list
const BANKS: Record<string, string> = {
  '044': 'Access Bank', '058': 'GTBank', '033': 'UBA',
  '011': 'First Bank', '057': 'Zenith Bank', '032': 'Union Bank',
  // Add more as needed
};

// GET - List user's bank accounts
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const claims = await verifyAuthToken(authToken || '');
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ bankAccounts });
}

// POST - Add new bank account
export async function POST(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const claims = await verifyAuthToken(authToken || '');
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { bankCode, accountNumber } = await request.json();
  
  if (!bankCode || !accountNumber || accountNumber.length !== 10) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const bankName = BANKS[bankCode] || 'Unknown Bank';
  
  // MVP: Mock account name verification
  // In production: Call Paystack/Flutterwave to verify
  const accountName = 'Account Holder'; // Placeholder

  const isFirst = await prisma.bankAccount.count({ where: { userId: user.id } }) === 0;

  const bankAccount = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      bankCode,
      bankName,
      accountNumber,
      accountName,
      isVerified: true, // MVP: auto-verify
      isDefault: isFirst,
    },
  });

  return NextResponse.json(bankAccount, { status: 201 });
}
```

---

## 6.2 Exchange Rate API

Create `app/api/exchange-rate/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  // MVP: Hardcoded rate
  // Production: Fetch from Yellow Card API
  return NextResponse.json({
    rate: 1600,
    currency: 'NGN',
    updatedAt: new Date().toISOString(),
  });
}
```

---

## 6.3 Withdrawals API

Create `app/api/withdrawals/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// GET - List withdrawals
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const claims = await verifyAuthToken(authToken || '');
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const withdrawals = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'withdrawal' },
    include: { bankAccount: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ withdrawals });
}

// POST - Create withdrawal (MVP mock)
export async function POST(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const claims = await verifyAuthToken(authToken || '');
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { amount, bankAccountId } = await request.json();
  
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, userId: user.id },
  });
  
  if (!bankAccount) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  const exchangeRate = 1600; // MVP hardcoded
  const ngnAmount = amount * exchangeRate;

  const withdrawal = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'withdrawal',
      status: 'completed', // MVP: instant completion
      amount,
      currency: 'USD',
      ngnAmount,
      exchangeRate,
      bankAccountId,
      completedAt: new Date(),
    },
  });

  return NextResponse.json(withdrawal, { status: 201 });
}
```

---

## 6.4 Withdrawals Page

Update `app/(dashboard)/dashboard/withdrawals/page.tsx` with:
- Exchange rate display
- Bank account selector
- Amount input
- "Withdraw" button
- Withdrawal history list

---

## Verification Checklist

- [ ] Can add bank account
- [ ] Bank accounts list displays
- [ ] Exchange rate shows
- [ ] Can initiate withdrawal
- [ ] Withdrawal appears in history
- [ ] Transaction record created in database

---

**Next Module**: [07-settings-module.md](./07-settings-module.md)
