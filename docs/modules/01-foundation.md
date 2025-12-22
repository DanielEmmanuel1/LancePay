# Module 1: Project Foundation

> **Prerequisite**: Read `DEVOPS.md` and `what-I-am-building.md` first

This module sets up the foundational infrastructure before any feature development.

---

## 1.1 Install Required Dependencies

```bash
# Core dependencies
npm install @privy-io/react-auth @privy-io/server-auth
npm install @neondatabase/serverless
npm install prisma @prisma/client
npm install zod
npm install clsx tailwind-merge
npm install lucide-react

# Development dependencies
npm install -D prisma
```

---

## 1.2 Configure Environment Variables

Create `.env.local` with the following structure:

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Database (Neon) - Get from neon.tech
DATABASE_URL="postgresql://..."

# Privy (Auth + Wallets) - Get from privy.io
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# Blockchain (Alchemy) - Get from alchemy.com
ALCHEMY_API_KEY=
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
```

**Action Items:**
1. [ ] Create Neon project at https://neon.tech
2. [ ] Create Privy app at https://privy.io (enable Google login)
3. [ ] Create Alchemy app at https://alchemy.com (select Base network)
4. [ ] Copy all credentials to `.env.local`

---

## 1.3 Initialize Prisma

```bash
npx prisma init
```

Then update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
}

// Core Models - Based on what-I-am-building.md database schema

model User {
  id            String   @id @default(uuid())
  privyId       String   @unique
  email         String   @unique
  name          String?
  phone         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  wallet        Wallet?
  bankAccounts  BankAccount[]
  invoices      Invoice[]
  transactions  Transaction[]
}

model Wallet {
  id            String   @id @default(uuid())
  userId        String   @unique
  address       String   @unique
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id])
}

model BankAccount {
  id            String   @id @default(uuid())
  userId        String
  bankName      String
  bankCode      String
  accountNumber String
  accountName   String
  isVerified    Boolean  @default(false)
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id])
  withdrawals   Transaction[] @relation("WithdrawalBank")

  @@unique([userId, accountNumber])
}

model Invoice {
  id            String   @id @default(uuid())
  userId        String
  invoiceNumber String   @unique
  clientEmail   String
  clientName    String?
  description   String
  amount        Decimal  @db.Decimal(10, 2)
  currency      String   @default("USD")
  status        String   @default("pending") // pending, paid, cancelled, expired
  paymentLink   String   @unique
  dueDate       DateTime?
  paidAt        DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])
  transaction   Transaction?
}

model Transaction {
  id            String   @id @default(uuid())
  userId        String
  type          String   // incoming, withdrawal
  status        String   @default("pending") // pending, processing, completed, failed
  amount        Decimal  @db.Decimal(10, 2)
  currency      String   @default("USD")
  ngnAmount     Decimal? @db.Decimal(15, 2)
  exchangeRate  Decimal? @db.Decimal(10, 4)
  invoiceId     String?  @unique
  bankAccountId String?
  txHash        String?
  createdAt     DateTime @default(now())
  completedAt   DateTime?

  user          User        @relation(fields: [userId], references: [id])
  invoice       Invoice?    @relation(fields: [invoiceId], references: [id])
  bankAccount   BankAccount? @relation("WithdrawalBank", fields: [bankAccountId], references: [id])
}
```

Run migration:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 1.4 Create Database Client

Create `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 1.5 Create Utility Functions

Create `lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function generateInvoiceNumber(): string {
  const prefix = 'INV'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}
```

---

## 1.6 Update tsconfig.json Paths

Ensure path aliases are configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 1.7 Folder Structure

Create the following folder structure:

```
LancePay/
├── app/
│   ├── (auth)/           # Auth pages (login)
│   ├── (dashboard)/      # Protected dashboard pages
│   ├── pay/              # Public payment pages
│   ├── api/              # API routes
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/               # Shared UI components
│   └── layout/           # Layout components (Sidebar)
├── lib/
│   ├── db.ts
│   ├── utils.ts
│   └── validations.ts
├── prisma/
│   └── schema.prisma
└── docs/
    └── modules/          # Module documentation
```

---

## Verification Checklist

Before moving to Module 2:

- [ ] All dependencies installed without errors
- [ ] `.env.local` has all required variables
- [ ] `npx prisma migrate dev` runs successfully
- [ ] `npx prisma studio` opens and shows tables
- [ ] Folder structure is created
- [ ] `npm run dev` runs without errors

---

**Next Module**: [02-auth-module.md](./02-auth-module.md) - Setting up Privy authentication
