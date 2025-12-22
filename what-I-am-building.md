# FreelancerPay402
## Technical Documentation & Integration Guide

**Version:** 1.0  
**Date:** December 2025

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture](#4-system-architecture)
5. [User Flows](#5-user-flows)
6. [x402 Protocol Integration](#6-x402-protocol-integration)
7. [Account Management System](#7-account-management-system)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Platform Integration Guide](#10-platform-integration-guide)
11. [Security Considerations](#11-security-considerations)
12. [Revenue Model](#12-revenue-model)
13. [Technical Stack](#13-technical-stack)

---

# 1. Executive Summary

FreelancerPay402 is a payment infrastructure that enables Nigerian freelancers to receive instant international payments using the x402 protocol, while completely abstracting blockchain complexity from end users.

## Key Value Propositions

**For Freelancers:**
- Receive payments in minutes instead of days
- Fees under 1% (compared to 5-10% on traditional platforms)
- No account freezes or arbitrary restrictions
- Hold balance in USD, convert to NGN when ready

**For Clients:**
- Pay invoices with credit card, bank transfer, or Apple/Google Pay
- No crypto knowledge required
- Familiar checkout experience
- Instant payment confirmation

**For Platforms:**
- Simple API integration
- Offer instant payouts to Nigerian talent
- Reduce payment support tickets
- Competitive advantage in emerging markets

---

# 2. Problem Statement

Nigerian freelancers working with international clients face significant payment challenges:

| Challenge | Impact |
|-----------|--------|
| **High Fees** | Payoneer charges 2% conversion + withdrawal fees. Wire transfers cost $25-50. Total loss: 5-10% per transaction |
| **Slow Settlement** | Bank transfers take 3-5 business days. Platform holds add additional delays |
| **Account Restrictions** | Nigerian accounts face freezes, verification delays, and arbitrary limits due to "high-risk region" classification |
| **Currency Volatility** | Naira fluctuations during multi-day settlement periods cause unpredictable losses |
| **Limited Access** | PayPal has restricted functionality in Nigeria. Many payment methods simply don't work |

## Market Context

- Estimated 17-20 million Nigerians do some form of remote/freelance work
- Nigeria consistently ranks top 5 globally in crypto adoption
- Tech talent export is a growing industry
- Existing solutions (Payoneer, Grey, Geegpay) still have significant friction

---

# 3. Solution Overview

## Core Principle: Crypto as Infrastructure, Not Interface

Users never see wallets, seed phrases, gas fees, or blockchain transactions. They see:
- Invoices
- Balances in USD
- Withdrawals to their bank account

The underlying USDC transfers on Base network are completely abstracted.

## How It Works (Simplified)

```
1. Freelancer creates invoice → "Logo Design — $150" → generates payment link

2. Client pays with card → Standard checkout experience, pays in USD/EUR/GBP

3. x402 settlement → Payment converts to USDC, settles via x402 in seconds

4. Freelancer notified → "You received $150!" — balance updates instantly

5. Withdraw to bank → One click converts to NGN, sends to local bank account
```

## What Makes This Different

| Traditional Flow | FreelancerPay402 Flow |
|------------------|----------------------|
| Client pays via PayPal/Wire | Client pays via card (familiar) |
| 3-5 days to reach platform | Instant settlement via x402 |
| Platform takes 20% + fees | Sub-1% total fees |
| Withdrawal to Payoneer | Direct to Nigerian bank |
| Another 2-3 days + fees | 10-30 minutes |
| **Total: 5-7 days, 10%+ fees** | **Total: Same day, <1% fees** |

---

# 4. System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FREELANCER SIDE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Signup (email/password)                                         │
│         │                                                           │
│         ▼                                                           │
│  2. Embedded wallet created automatically (user never sees it)      │
│         │                                                           │
│         ▼                                                           │
│  3. Creates invoice → generates payment link                        │
│         │                                                           │
│         ▼                                                           │
│  4. Shares link with client                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT SIDE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  5. Client opens invoice link                                       │
│         │                                                           │
│         ▼                                                           │
│  6. Clicks "Pay $150" → Onramp widget opens (looks like Stripe)     │
│         │                                                           │
│         ▼                                                           │
│  7. Enters card details (normal checkout UX)                        │
│         │                                                           │
│         ▼                                                           │
│  8. Onramp converts: USD card charge → USDC                         │
│         │                                                           │
│         ▼                                                           │
│  9. x402 payment: USDC sent to freelancer's embedded wallet         │
│         │                                                           │
│         ▼                                                           │
│  10. Client sees "Payment successful!" + receipt                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACK TO FREELANCER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  11. Push notification: "You received $150!"                        │
│         │                                                           │
│         ▼                                                           │
│  12. Balance updates: $450.00 (≈ ₦720,000)                          │
│         │                                                           │
│         ▼                                                           │
│  13. Clicks "Withdraw to GTBank"                                    │
│         │                                                           │
│         ▼                                                           │
│  14. Off-ramp: USDC → NGN → Bank transfer                           │
│         │                                                           │
│         ▼                                                           │
│  15. "₦720,000 sent to your account" (10-30 mins)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

| Component | Provider Options | Purpose |
|-----------|-----------------|---------|
| **Embedded Wallets** | Privy, Dynamic, Thirdweb | Creates wallets tied to email accounts, no seed phrases |
| **Fiat Onramp** | MoonPay, Transak, Coinbase Onramp | Converts client's card payment to USDC |
| **x402 Facilitator** | Coinbase CDP | Handles x402 payment verification and settlement |
| **Off-ramp** | Yellow Card, Ramp Network | Converts USDC to NGN and sends to local bank |
| **Blockchain** | Base (Coinbase L2) | Low-cost, fast settlement layer for USDC transfers |
| **Database** | PostgreSQL | Users, invoices, transactions, bank accounts |
| **Backend** | FastAPI or Node.js | API server, business logic |
| **Frontend** | Next.js / React | Web application |

---

# 5. User Flows

## 5.1 Freelancer Onboarding

**What the user experiences:**
1. Visit signup page
2. Enter email, password, full name
3. Verify email
4. Add Nigerian bank account for withdrawals
5. Done — can create invoices immediately

**What happens behind the scenes:**
1. User record created in database
2. Privy/Dynamic creates embedded wallet linked to email
3. Wallet address stored in database (user never sees it)
4. Bank account verified via name matching

**Key Point:** No wallet connection, no seed phrase, no crypto terminology anywhere.

## 5.2 Invoice Creation

**User actions:**
1. Click "Create Invoice"
2. Enter: Client email, description, amount (USD), due date
3. Click "Create & Send"
4. Copy payment link or send directly via email

**System actions:**
1. Generate unique invoice ID
2. Create payment link: `pay.freelancerpay402.com/inv_abc123`
3. Store invoice in database with status "pending"
4. Optionally send email to client

## 5.3 Client Payment

**What the client sees:**
```
┌─────────────────────────────────────────────┐
│                                             │
│  INVOICE                                    │
│  ───────────────────────────────────────    │
│                                             │
│  From: Chidi Okonkwo                        │
│  To: john@company.com                       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Logo Design - Primary + Variants    │   │
│  │                                     │   │
│  │                           $150.00   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Due: December 25, 2025                     │
│                                             │
│  Pay with:                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  Card   │ │  Bank   │ │ Apple   │       │
│  │   💳    │ │   🏦    │ │  Pay    │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│           [ Pay $150.00 ]                   │
│                                             │
│  🔒 Secure payment                          │
│                                             │
└─────────────────────────────────────────────┘
```

**No mention of crypto, USDC, wallets, or blockchain anywhere.**

**Payment flow:**
1. Client clicks "Pay $150.00"
2. Onramp widget opens (looks like standard Stripe checkout)
3. Client enters card details
4. Onramp charges card in USD, converts to USDC
5. x402 protocol transfers USDC to freelancer's embedded wallet
6. Client sees "Payment successful!" with receipt
7. Invoice status updates to "paid"

## 5.4 Withdrawal to Bank

**What the freelancer sees:**
```
┌─────────────────────────────────────────────┐
│  Withdraw to Bank                           │
├─────────────────────────────────────────────┤
│                                             │
│  Available: $450.00                         │
│                                             │
│  Amount (USD)                               │
│  ┌─────────────────────────────────────┐   │
│  │ 450.00                              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  You'll receive: ₦720,000                   │
│  Rate: ₦1,600/$1                            │
│                                             │
│  Bank Account                               │
│  ┌─────────────────────────────────────┐   │
│  │ GTBank - ****1234                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [ Withdraw ₦720,000 ]                      │
│                                             │
│  Estimated arrival: 10-30 minutes           │
│                                             │
└─────────────────────────────────────────────┘
```

**Withdrawal flow:**
1. Freelancer enters amount and selects bank account
2. System shows current exchange rate and NGN equivalent
3. Freelancer confirms withdrawal
4. Backend sends USDC from embedded wallet to off-ramp (Yellow Card)
5. Off-ramp converts USDC to NGN
6. NGN sent to freelancer's bank account
7. Freelancer notified when complete

---

# 6. x402 Protocol Integration

## What is x402?

x402 is an open payment protocol that uses the HTTP 402 "Payment Required" status code to enable pay-per-request payments. It allows:
- Instant settlement via stablecoins (USDC)
- Sub-cent transaction costs on L2s like Base
- Machine-to-machine payments without accounts or API keys

## How FreelancerPay402 Uses x402

We use x402 as the settlement layer between the fiat onramp and the freelancer's wallet:

```
Client's Card → Onramp → USDC → x402 Protocol → Freelancer's Wallet
```

## x402 Payment Flow

### Step 1: Payment Request

When a client is ready to pay, our server returns an HTTP 402 response:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "paymentRequired": {
    "scheme": "exact",
    "network": "base",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  // USDC on Base
    "payTo": "0x...",  // Freelancer's embedded wallet address
    "maxAmountRequired": "150000000",  // $150 in USDC (6 decimals)
    "resource": "/api/invoices/inv_abc123/complete",
    "description": "Logo Design - Primary + Variants"
  }
}
```

### Step 2: Payment Execution

The onramp (acting as the client) creates a signed payment:

```javascript
// Onramp signs USDC transfer authorization
const paymentPayload = {
  scheme: "exact",
  network: "base",
  payload: {
    signature: "0x...",  // ERC-3009 TransferWithAuthorization signature
    authorization: {
      from: onrampWallet,
      to: freelancerWallet,
      value: "150000000",
      validAfter: 0,
      validBefore: Math.floor(Date.now() / 1000) + 3600,
      nonce: randomNonce
    }
  }
};
```

### Step 3: Verification & Settlement

Our server sends the payment to the x402 facilitator:

```javascript
// Verify payment
const verifyResponse = await fetch('https://x402.org/verify', {
  method: 'POST',
  body: JSON.stringify({
    paymentPayload,
    paymentRequirements
  })
});

// If valid, settle the payment
const settleResponse = await fetch('https://x402.org/settle', {
  method: 'POST',
  body: JSON.stringify({
    paymentPayload,
    paymentRequirements
  })
});
```

### Step 4: Confirmation

Once settled, the USDC is in the freelancer's embedded wallet. We update our database and notify the freelancer.

## Key x402 Concepts

| Concept | Description |
|---------|-------------|
| **Facilitator** | Server that verifies and executes payments (Coinbase CDP provides one) |
| **Scheme** | Payment type — "exact" means pay exactly this amount |
| **Network** | Blockchain to settle on — we use Base for low fees |
| **Asset** | Token to pay with — we use USDC |
| **PayTo** | Recipient wallet address |

## Why x402 for This Use Case?

1. **Instant settlement** — No waiting for bank transfers
2. **Low fees** — Base network fees are fractions of a cent
3. **Programmable** — Can trigger actions automatically on payment
4. **No accounts needed** — Client doesn't need to create an account
5. **Stablecoin** — USDC maintains USD value, no volatility

---

# 7. Account Management System

## Design Philosophy

Users get traditional authentication (email/password, Google login) with crypto capabilities running silently underneath. Every user account has an embedded wallet they never interact with directly.

## Embedded Wallet Options

### Option 1: Privy (Recommended)

```javascript
// Frontend: User login
import { usePrivy } from '@privy-io/react-auth';

function LoginPage() {
  const { login, authenticated, user } = usePrivy();

  const handleLogin = async () => {
    await login();  // Handles email/password OR social login
    // Wallet is created/accessed automatically
  };

  if (authenticated) {
    // user.wallet.address exists but user never sees it
    // We store this in our database
  }

  return (
    <div>
      <button onClick={handleLogin}>Sign in with Email</button>
      <button onClick={() => login({ loginMethods: ['google'] })}>
        Sign in with Google
      </button>
    </div>
  );
}
```

### Option 2: Dynamic

Similar to Privy, provides email/social login with automatic wallet creation.

### Option 3: Self-Managed (More Control, More Responsibility)

```javascript
// Generate wallet on signup
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encrypt } from './kms';  // AWS KMS or similar

async function createUserWithWallet(email, password) {
  // Generate wallet
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  // Encrypt private key before storing
  const encryptedKey = await encrypt(privateKey);
  
  // Store user with encrypted wallet
  const user = await db.users.create({
    email,
    passwordHash: await hash(password),
    walletAddress: account.address,
    encryptedPrivateKey: encryptedKey,
  });
  
  return user;
}
```

**Warning:** Self-managed wallets make you a custodian with regulatory and security responsibilities.

## What Users See vs. What Exists

| User Sees | What Actually Exists |
|-----------|---------------------|
| "Balance: $450.00" | USDC balance in embedded wallet on Base |
| "Withdraw to bank" | USDC → Off-ramp → NGN → Bank transfer |
| "Payment received!" | x402 USDC transfer to wallet address |
| Email/password login | Privy session + embedded wallet access |

---

# 8. Database Schema

```sql
-- Users table (what users interact with)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL if using OAuth only
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table (hidden from users)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(42) NOT NULL,  -- Ethereum address
    provider VARCHAR(50) NOT NULL,  -- 'privy', 'dynamic', 'self-managed'
    provider_user_id VARCHAR(255),  -- External ID from Privy/Dynamic
    network VARCHAR(20) DEFAULT 'base',
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)  -- One wallet per user
);

-- Bank accounts for withdrawals
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(10) NOT NULL,  -- Nigerian bank code
    account_number VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- Human-readable: INV-2025-001
    client_email VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    description TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,  -- USD amount
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',  -- pending, paid, cancelled, expired
    payment_link VARCHAR(255) UNIQUE NOT NULL,
    due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (all money movements)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL,  -- 'incoming', 'withdrawal', 'fee'
    status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
    
    -- Amounts
    amount DECIMAL(36, 18) NOT NULL,  -- Crypto precision
    currency VARCHAR(10) NOT NULL,  -- 'USDC', 'NGN'
    
    -- For incoming payments
    invoice_id UUID REFERENCES invoices(id),
    
    -- For withdrawals
    bank_account_id UUID REFERENCES bank_accounts(id),
    ngn_amount DECIMAL(18, 2),
    exchange_rate DECIMAL(18, 4),
    
    -- Blockchain data
    tx_hash VARCHAR(66),
    block_number BIGINT,
    
    -- External references
    external_reference VARCHAR(255),  -- Off-ramp reference, etc.
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cached balances (for quick display, synced periodically)
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) UNIQUE,
    usdc_balance DECIMAL(36, 18) DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events (for debugging and replay)
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,  -- 'privy', 'moonpay', 'yellowcard', 'x402'
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_link ON invoices(payment_link);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

---

# 9. API Reference

## Authentication Endpoints

### POST /api/auth/signup
Create a new account.

**Request:**
```json
{
  "email": "freelancer@email.com",
  "password": "securepassword123",
  "fullName": "Chidi Okonkwo"
}
```

**Response:**
```json
{
  "id": "usr_abc123",
  "email": "freelancer@email.com",
  "fullName": "Chidi Okonkwo",
  "emailVerified": false
}
```

### POST /api/auth/login
Login with email/password.

**Request:**
```json
{
  "email": "freelancer@email.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "freelancer@email.com",
    "fullName": "Chidi Okonkwo"
  }
}
```

## User Endpoints

### GET /api/user/balance
Get current balance (requires authentication).

**Response:**
```json
{
  "available": {
    "amount": 450.00,
    "currency": "USD",
    "display": "$450.00"
  },
  "localEquivalent": {
    "amount": 720000,
    "currency": "NGN",
    "display": "₦720,000",
    "rate": 1600
  },
  "pending": {
    "amount": 0,
    "currency": "USD"
  }
}
```

### GET /api/user/profile
Get user profile.

### PUT /api/user/profile
Update user profile.

## Bank Account Endpoints

### GET /api/bank-accounts
List user's bank accounts.

**Response:**
```json
{
  "bankAccounts": [
    {
      "id": "ba_abc123",
      "bankName": "GTBank",
      "bankCode": "058",
      "accountNumber": "****1234",
      "accountName": "CHIDI OKONKWO",
      "isVerified": true,
      "isDefault": true
    }
  ]
}
```

### POST /api/bank-accounts
Add a new bank account.

**Request:**
```json
{
  "bankCode": "058",
  "accountNumber": "0123456789"
}
```

### DELETE /api/bank-accounts/:id
Remove a bank account.

## Invoice Endpoints

### GET /api/invoices
List all invoices.

**Query Parameters:**
- `status`: Filter by status (pending, paid, cancelled)
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "invoices": [
    {
      "id": "inv_abc123",
      "invoiceNumber": "INV-2025-001",
      "clientEmail": "john@company.com",
      "description": "Logo Design - Primary + Variants",
      "amount": 150.00,
      "currency": "USD",
      "status": "pending",
      "paymentLink": "https://pay.freelancerpay402.com/inv_abc123",
      "dueDate": "2025-12-25",
      "createdAt": "2025-12-18T10:30:00Z"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

### POST /api/invoices
Create a new invoice.

**Request:**
```json
{
  "clientEmail": "john@company.com",
  "clientName": "John Smith",
  "description": "Logo Design - Primary + Variants",
  "amount": 150.00,
  "dueDate": "2025-12-25",
  "sendEmail": true
}
```

**Response:**
```json
{
  "id": "inv_abc123",
  "invoiceNumber": "INV-2025-001",
  "paymentLink": "https://pay.freelancerpay402.com/inv_abc123",
  "status": "pending",
  "createdAt": "2025-12-18T10:30:00Z"
}
```

### GET /api/invoices/:id
Get invoice details.

### PUT /api/invoices/:id
Update invoice (only if status is pending).

### DELETE /api/invoices/:id
Cancel invoice.

## Payment Endpoints (Public)

### GET /api/pay/:invoiceId
Get invoice details for payment page (no auth required).

**Response:**
```json
{
  "invoice": {
    "id": "inv_abc123",
    "freelancerName": "Chidi Okonkwo",
    "description": "Logo Design - Primary + Variants",
    "amount": 150.00,
    "currency": "USD",
    "dueDate": "2025-12-25",
    "status": "pending"
  },
  "paymentMethods": ["card", "bank_transfer", "apple_pay", "google_pay"],
  "onrampConfig": {
    "provider": "moonpay",
    "widgetUrl": "https://buy.moonpay.com/...",
    "targetAddress": "0x...",
    "targetAmount": "150000000",
    "targetAsset": "USDC_BASE"
  }
}
```

### POST /api/pay/:invoiceId/complete
Called by onramp webhook when payment is complete.

**Request (from onramp webhook):**
```json
{
  "transactionId": "mp_tx_abc123",
  "status": "completed",
  "cryptoAmount": "150000000",
  "cryptoAsset": "USDC",
  "txHash": "0x..."
}
```

## Withdrawal Endpoints

### GET /api/withdrawals
List withdrawal history.

### POST /api/withdrawals
Initiate a withdrawal.

**Request:**
```json
{
  "amount": 450.00,
  "bankAccountId": "ba_abc123"
}
```

**Response:**
```json
{
  "id": "wd_abc123",
  "status": "processing",
  "amount": 450.00,
  "currency": "USD",
  "ngnAmount": 720000,
  "exchangeRate": 1600,
  "bankAccount": {
    "bankName": "GTBank",
    "accountNumber": "****1234"
  },
  "estimatedArrival": "10-30 minutes",
  "createdAt": "2025-12-18T14:30:00Z"
}
```

### GET /api/withdrawals/:id
Get withdrawal status.

## Transaction Endpoints

### GET /api/transactions
List all transactions (incoming payments + withdrawals).

**Query Parameters:**
- `type`: Filter by type (incoming, withdrawal)
- `limit`: Number of results
- `offset`: Pagination offset

---

# 10. Platform Integration Guide

FreelancerPay402 can be integrated into existing freelance platforms, marketplaces, or HR systems to offer instant payouts to Nigerian workers.

## Integration Options

### Option A: Payment Link API

Simplest integration — your platform generates payment links for freelancers.

**Use Case:** Marketplace wants to let clients pay freelancers directly.

**Flow:**
1. Freelancer registers on your platform and connects FreelancerPay402 account
2. When client is ready to pay, your platform calls our API to generate a payment link
3. Client pays via the link
4. Freelancer receives funds instantly
5. Your platform receives webhook notification of payment

**API Call:**
```bash
POST https://api.freelancerpay402.com/v1/platform/invoices
Authorization: Bearer YOUR_PLATFORM_API_KEY

{
  "freelancerExternalId": "your_user_123",  # Your platform's user ID
  "clientEmail": "client@company.com",
  "description": "Project: Website Redesign",
  "amount": 500.00,
  "metadata": {
    "projectId": "proj_456",
    "milestoneId": "ms_789"
  }
}
```

**Response:**
```json
{
  "invoiceId": "inv_abc123",
  "paymentLink": "https://pay.freelancerpay402.com/inv_abc123",
  "status": "pending"
}
```

### Option B: Embedded Payout API

Your platform holds funds and triggers payouts to freelancers.

**Use Case:** Platform collects payment from client, releases to freelancer after milestone approval.

**Flow:**
1. Client pays your platform (via your existing payment system)
2. Freelancer completes work
3. Client/platform approves milestone
4. Your platform calls our Payout API
5. We convert your USDC to freelancer's wallet
6. Freelancer withdraws to bank

**Setup:**
1. Your platform maintains a USDC treasury wallet on Base
2. You register this wallet with our platform
3. When triggering payout, you sign a transfer authorization

**API Call:**
```bash
POST https://api.freelancerpay402.com/v1/platform/payouts
Authorization: Bearer YOUR_PLATFORM_API_KEY

{
  "freelancerExternalId": "your_user_123",
  "amount": 500.00,
  "currency": "USD",
  "authorization": {
    "signature": "0x...",  # ERC-3009 TransferWithAuthorization
    "from": "0x...",       # Your treasury wallet
    "validBefore": 1734567890,
    "nonce": "0x..."
  },
  "metadata": {
    "projectId": "proj_456",
    "reason": "Milestone 3 completion"
  }
}
```

### Option C: White-Label Widget

Embed our payment/withdrawal UI directly in your platform.

**Use Case:** You want a seamless experience without redirecting users.

**Implementation:**
```html
<!-- In your platform's frontend -->
<script src="https://cdn.freelancerpay402.com/widget.js"></script>

<div id="fp402-widget"></div>

<script>
  FreelancerPay402.init({
    platformId: 'YOUR_PLATFORM_ID',
    userId: 'your_user_123',
    mode: 'withdrawal',  // or 'invoice', 'balance'
    theme: {
      primaryColor: '#your-brand-color'
    },
    onSuccess: (result) => {
      console.log('Withdrawal initiated:', result);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });
</script>
```

## Webhook Events

Configure webhook URL in your platform dashboard to receive real-time updates.

**Events:**

| Event | Description |
|-------|-------------|
| `invoice.paid` | Payment received for an invoice |
| `withdrawal.completed` | Funds sent to freelancer's bank |
| `withdrawal.failed` | Withdrawal failed (with reason) |
| `user.connected` | Freelancer connected their account |

**Webhook Payload Example:**
```json
{
  "event": "invoice.paid",
  "timestamp": "2025-12-18T14:30:00Z",
  "data": {
    "invoiceId": "inv_abc123",
    "freelancerExternalId": "your_user_123",
    "amount": 500.00,
    "currency": "USD",
    "paidAt": "2025-12-18T14:30:00Z",
    "metadata": {
      "projectId": "proj_456"
    }
  }
}
```

## Sandbox/Testing

Use our sandbox environment for development:
- Base URL: `https://sandbox-api.freelancerpay402.com`
- Uses Base Sepolia testnet
- Test card numbers provided in dashboard

---

# 11. Security Considerations

## For End Users

### Embedded Wallet Security

- Private keys are never exposed to users or our servers
- Keys are split using MPC (Multi-Party Computation) across multiple servers
- Recovery via email verification (no seed phrases to lose)
- Biometric authentication option on mobile

### Account Security

- Email verification required
- Password requirements: 12+ characters, mixed case, numbers
- Optional 2FA via authenticator app
- Session management with automatic logout
- Rate limiting on sensitive endpoints

## For Platform Integrators

### API Security

- API keys with granular permissions
- IP whitelisting available
- Webhook signature verification
- Request signing for high-value operations

### Compliance

- KYC/AML compliance built into onramp providers
- Transaction monitoring for suspicious activity
- Sanctions screening on all parties
- Audit logs for all operations

## Smart Contract Security

- Using audited USDC contract on Base
- x402 facilitator operated by Coinbase
- No custom smart contracts required
- Standard ERC-3009 for transfer authorizations

---

# 12. Revenue Model

## Fee Structure

| Operation | Fee | Who Pays |
|-----------|-----|----------|
| Receiving payment | 0.5% | Freelancer (deducted from received amount) |
| Withdrawal to bank | 0.5% + ₦50 | Freelancer |
| Currency conversion | Spread built into rate | Freelancer |
| Invoice creation | Free | — |
| Account maintenance | Free | — |

## Example Transaction

Client pays $100 for freelance work:

```
Client pays:           $100.00
- Onramp fee (1.5%):   - $1.50  (paid by client, handled by onramp)
- Platform fee (0.5%): - $0.50  (our revenue)
                       ________
Freelancer receives:   $98.00

Freelancer withdraws $98:
- Withdrawal fee:      - $0.49  (0.5%)
- Bank fee:           - ₦50
- Exchange rate:       ₦1,600/$1 (market rate - spread)
                       ________
Freelancer gets:       ~₦156,000
```

**Compared to Traditional:**
- Upwork: 10% platform fee + Payoneer fees = ~$85 received
- FreelancerPay402: ~$98 received (15% more money)

## Platform Integration Pricing

| Tier | Monthly Volume | Fee |
|------|----------------|-----|
| Starter | Up to $10,000 | 1.0% per transaction |
| Growth | $10,000 - $100,000 | 0.75% per transaction |
| Enterprise | $100,000+ | Custom pricing |

---

# 13. Technical Stack

## Recommended Stack

### Backend
- **Runtime:** Node.js 20+ or Python 3.11+
- **Framework:** Express/Fastify (Node) or FastAPI (Python)
- **Database:** PostgreSQL 15+
- **Cache:** Redis (for sessions, rate limiting)
- **Queue:** BullMQ or Celery (for async jobs)

### Frontend
- **Framework:** Next.js 14+ (React)
- **Styling:** Tailwind CSS
- **State:** React Query + Zustand
- **Forms:** React Hook Form + Zod

### Infrastructure
- **Hosting:** Vercel (frontend), Railway/Render (backend)
- **Database:** Supabase or Neon (managed Postgres)
- **Monitoring:** Sentry, LogTail
- **Email:** Resend or SendGrid

### Blockchain/Web3
- **Wallet Provider:** Privy or Dynamic
- **Chain:** Base (Coinbase L2)
- **RPC:** Alchemy or QuickNode
- **Libraries:** viem, wagmi

### Third-Party Services
- **Fiat Onramp:** MoonPay, Transak, or Coinbase Onramp
- **Off-ramp:** Yellow Card
- **x402 Facilitator:** Coinbase CDP

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/freelancerpay402

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# Privy (Embedded Wallets)
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret

# Blockchain
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Onramp
MOONPAY_API_KEY=your-moonpay-key
MOONPAY_WEBHOOK_SECRET=your-webhook-secret

# Off-ramp
YELLOWCARD_API_KEY=your-yellowcard-key
YELLOWCARD_SECRET_KEY=your-secret-key

# x402
X402_FACILITATOR_URL=https://x402.org

# Email
RESEND_API_KEY=your-resend-key
```

---

# Appendix A: Glossary

| Term | Definition |
|------|------------|
| **x402** | Open payment protocol using HTTP 402 status code for pay-per-request payments |
| **USDC** | USD Coin, a stablecoin pegged 1:1 to US Dollar |
| **Base** | Coinbase's Layer 2 blockchain, low-cost and fast |
| **Embedded Wallet** | Crypto wallet created and managed by a provider, tied to email/social login |
| **Onramp** | Service that converts fiat currency (USD, EUR) to cryptocurrency |
| **Off-ramp** | Service that converts cryptocurrency to fiat currency |
| **Facilitator** | Server that verifies and executes x402 payments |
| **ERC-3009** | Ethereum standard for gasless token transfers via signed authorizations |
| **MPC** | Multi-Party Computation, security technique where private keys are split across multiple parties |

---

# Appendix B: Useful Links

- **x402 Protocol:** https://x402.org
- **x402 Documentation:** https://x402.gitbook.io/x402
- **x402 GitHub:** https://github.com/coinbase/x402
- **Coinbase CDP:** https://docs.cdp.coinbase.com/x402
- **Privy:** https://privy.io
- **Dynamic:** https://dynamic.xyz
- **MoonPay:** https://moonpay.com
- **Yellow Card:** https://yellowcard.io
- **Base Network:** https://base.org

---

# Appendix C: Quick Start Checklist

## For Hackathon MVP

- [ ] Set up Next.js project with Tailwind
- [ ] Integrate Privy for authentication + embedded wallets
- [ ] Create PostgreSQL database with basic schema
- [ ] Build invoice creation flow
- [ ] Build payment page (mock onramp for hackathon)
- [ ] Implement x402 payment settlement
- [ ] Build freelancer dashboard with balance display
- [ ] Mock withdrawal flow (show UI, explain integration)

## For Production

- [ ] Complete all hackathon items
- [ ] Integrate real fiat onramp (MoonPay/Transak)
- [ ] Integrate Yellow Card for NGN off-ramp
- [ ] Add email notifications (Resend)
- [ ] Implement proper error handling
- [ ] Add webhook handlers for all services
- [ ] Set up monitoring (Sentry)
- [ ] Security audit
- [ ] Load testing
- [ ] Compliance review

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Author:** FreelancerPay402 Team