# Module 2: Authentication (Privy + Google OAuth)

> **Prerequisite**: Complete Module 1 (Foundation) first

This module implements authentication using Privy with Google OAuth. Privy handles both authentication AND embedded wallet creation automatically.

---

## 2.1 Privy Dashboard Setup

Before coding, configure Privy at https://dashboard.privy.io:

1. [ ] Create new app or select existing
2. [ ] Go to **Login Methods** → Enable:
   - Google OAuth
   - Email (optional)
3. [ ] Go to **Embedded Wallets** → Enable:
   - Create on login: All users
   - Default chain: Base
4. [ ] Go to **Webhooks** → Add endpoint:
   - URL: `{YOUR_APP_URL}/api/webhooks/privy`
   - Events: `user.created`
5. [ ] Copy App ID and App Secret to `.env.local`

---

## 2.2 Create Privy Provider

Create `app/providers.tsx`:

```tsx
'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { base } from 'viem/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Login methods
        loginMethods: ['google', 'email'],
        
        // Appearance
        appearance: {
          theme: 'light',
          accentColor: '#111827',
          logo: '/logo.png',
        },
        
        // Embedded wallets
        embeddedWallets: {
          createOnLogin: 'all-users',
          noPromptOnSignature: true,
        },
        
        // Default chain (Base)
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

---

## 2.3 Update Root Layout

Update `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'LancePay - Get Paid Globally',
  description: 'Instant international payments for Nigerian freelancers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 2.4 Create Server-Side Auth Helper

Create `lib/auth.ts`:

```typescript
import { PrivyClient } from '@privy-io/server-auth';
import { cookies } from 'next/headers';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function getUser() {
  const cookieStore = cookies();
  const authToken = cookieStore.get('privy-token')?.value;
  
  if (!authToken) return null;
  
  try {
    const claims = await privy.verifyAuthToken(authToken);
    return claims;
  } catch {
    return null;
  }
}

export async function verifyAuthToken(token: string) {
  try {
    return await privy.verifyAuthToken(token);
  } catch {
    return null;
  }
}
```

---

## 2.5 Create Login Page

Create `app/(auth)/login/page.tsx`:

```tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/dashboard');
    }
  }, [ready, authenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-brand-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">LP</span>
          </div>
          
          <h1 className="text-2xl font-bold text-brand-black mb-2">
            Welcome to LancePay
          </h1>
          <p className="text-brand-gray mb-8">
            Sign in to manage your invoices and payments
          </p>
          
          <button
            onClick={login}
            disabled={!ready}
            className="w-full py-3 px-4 bg-brand-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {ready ? 'Sign in with Google' : 'Loading...'}
          </button>
          
          <p className="text-xs text-brand-gray mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 2.6 Create Privy Webhook Handler

Create `app/api/webhooks/privy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('privy-signature');
  
  // Verify webhook signature (optional but recommended)
  if (process.env.PRIVY_WEBHOOK_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PRIVY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }
  
  const event = JSON.parse(body);
  
  // Handle user.created event
  if (event.type === 'user.created') {
    const { id: privyId, email, wallet } = event.data;
    
    // Create user in database
    await prisma.user.upsert({
      where: { privyId },
      update: {},
      create: {
        privyId,
        email: email?.address || '',
        wallet: wallet?.address ? {
          create: {
            address: wallet.address,
          },
        } : undefined,
      },
    });
  }
  
  return NextResponse.json({ received: true });
}
```

---

## 2.7 Create Auth Guard Component

Create `components/AuthGuard.tsx`:

```tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
    }
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-black" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
```

---

## 2.8 Create Dashboard Layout

Create `app/(dashboard)/layout.tsx`:

```tsx
import { AuthGuard } from '@/components/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-light">
        {/* Sidebar will be added in Module 3 */}
        <main className="p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
```

---

## 2.9 Create Simple Dashboard Page

Create `app/(dashboard)/dashboard/page.tsx`:

```tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';

export default function DashboardPage() {
  const { user, logout } = usePrivy();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-black mb-4">Dashboard</h1>
      
      <div className="bg-white rounded-xl border border-brand-border p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">Welcome!</h2>
        <p className="text-brand-gray">Email: {user?.email?.address || user?.google?.email}</p>
        <p className="text-brand-gray">Wallet: {user?.wallet?.address || 'Creating...'}</p>
      </div>
      
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
```

---

## Verification Checklist

Before moving to Module 3:

- [ ] Privy dashboard configured with Google OAuth
- [ ] `npm install @privy-io/react-auth @privy-io/server-auth viem` completed
- [ ] Can access `/login` page
- [ ] Clicking "Sign in with Google" opens Privy modal
- [ ] After Google login, redirected to `/dashboard`
- [ ] User info displayed on dashboard
- [ ] Wallet address visible (embedded wallet created)
- [ ] Sign out works correctly
- [ ] Webhook endpoint receives `user.created` event (check Privy dashboard logs)
- [ ] User created in database (check with `npx prisma studio`)

---

## Troubleshooting

**"Invalid Privy App ID"**
- Check `NEXT_PUBLIC_PRIVY_APP_ID` matches Privy dashboard

**Google login not working**
- Verify Google OAuth is enabled in Privy dashboard
- Check allowed domains in Privy settings

**Wallet not created**
- Ensure "Create on login: All users" is enabled in Privy

**Webhook not receiving events**
- Check webhook URL is publicly accessible
- Verify endpoint returns 200 status

---

**Next Module**: [03-dashboard-module.md](./03-dashboard-module.md) - Building the dashboard UI
