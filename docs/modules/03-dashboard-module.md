# Module 3: Dashboard & Layout

> **Prerequisite**: Complete Module 2 (Authentication) first

This module builds the main dashboard UI with sidebar navigation, balance display, and activity feed.

---

## 3.1 Create Sidebar Component

Create `components/layout/Sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { 
  LayoutDashboard, 
  FileText, 
  ArrowUpRight, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/invoices', label: 'Invoices', icon: FileText },
  { href: '/dashboard/withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = usePrivy();

  return (
    <aside className="w-64 bg-white border-r border-brand-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-brand-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LP</span>
          </div>
          <span className="font-bold text-xl text-brand-black">LancePay</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-brand-black text-white' 
                      : 'text-brand-gray hover:bg-brand-light hover:text-brand-black'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-brand-border">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 bg-brand-light rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-brand-gray">
              {user?.google?.name?.[0] || user?.email?.address?.[0] || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-black truncate">
              {user?.google?.name || 'User'}
            </p>
            <p className="text-xs text-brand-gray truncate">
              {user?.email?.address || user?.google?.email}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-gray hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
```

---

## 3.2 Update Dashboard Layout

Update `app/(dashboard)/layout.tsx`:

```tsx
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-brand-light flex">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
```

---

## 3.3 Create Balance API Route

Create `app/api/user/balance/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// USDC contract on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export async function GET(request: NextRequest) {
  // Get auth token from header
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claims = await verifyAuthToken(authToken);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Get user wallet
  const user = await prisma.user.findUnique({
    where: { privyId: claims.userId },
    include: { wallet: true },
  });

  if (!user?.wallet) {
    return NextResponse.json({
      available: { amount: 0, currency: 'USD', display: '$0.00' },
      localEquivalent: { amount: 0, currency: 'NGN', display: '₦0', rate: 1600 },
      pending: { amount: 0, currency: 'USD' },
    });
  }

  // Read USDC balance from blockchain
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  });

  try {
    const balance = await client.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [user.wallet.address as `0x${string}`],
    });

    const usdAmount = parseFloat(formatUnits(balance, 6)); // USDC has 6 decimals
    const exchangeRate = 1600; // TODO: Get from Yellow Card API
    const ngnAmount = usdAmount * exchangeRate;

    return NextResponse.json({
      available: {
        amount: usdAmount,
        currency: 'USD',
        display: `$${usdAmount.toFixed(2)}`,
      },
      localEquivalent: {
        amount: ngnAmount,
        currency: 'NGN',
        display: `₦${ngnAmount.toLocaleString()}`,
        rate: exchangeRate,
      },
      pending: { amount: 0, currency: 'USD' },
    });
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return NextResponse.json({
      available: { amount: 0, currency: 'USD', display: '$0.00' },
      localEquivalent: { amount: 0, currency: 'NGN', display: '₦0', rate: 1600 },
      pending: { amount: 0, currency: 'USD' },
    });
  }
}
```

---

## 3.4 Create Dashboard Components

### BalanceCard Component

Create `components/dashboard/BalanceCard.tsx`:

```tsx
interface BalanceCardProps {
  balance: {
    available: { display: string };
    localEquivalent: { display: string; rate: number };
  } | null;
  isLoading: boolean;
}

export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-40" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-border p-6">
      <p className="text-sm text-brand-gray font-medium mb-1">Available Balance</p>
      <h2 className="text-4xl font-bold text-brand-black mb-2">
        {balance?.available.display || '$0.00'}
      </h2>
      <p className="text-sm text-brand-gray">
        ≈ {balance?.localEquivalent.display || '₦0'} 
        <span className="text-xs ml-1">
          @ ₦{balance?.localEquivalent.rate.toLocaleString() || '0'}/$1
        </span>
      </p>
    </div>
  );
}
```

### QuickActions Component

Create `components/dashboard/QuickActions.tsx`:

```tsx
import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Link 
        href="/dashboard/invoices/new" 
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Create Invoice
      </Link>
      <Link 
        href="/dashboard/withdrawals" 
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-brand-border rounded-lg font-medium hover:bg-brand-light transition-colors"
      >
        <ArrowUpRight className="w-5 h-5" />
        Withdraw
      </Link>
    </div>
  );
}
```

---

## 3.5 Update Dashboard Page

Update `app/(dashboard)/dashboard/page.tsx`:

```tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { QuickActions } from '@/components/dashboard/QuickActions';

export default function DashboardPage() {
  const { getAccessToken } = usePrivy();
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/user/balance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setBalance(await res.json());
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [getAccessToken]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-brand-black">Dashboard</h1>
        <p className="text-brand-gray">Welcome back! Here's your overview.</p>
      </div>

      <BalanceCard balance={balance} isLoading={isLoading} />
      
      <QuickActions />

      {/* Recent transactions will be added later */}
      <div className="bg-white rounded-2xl border border-brand-border p-6">
        <h3 className="text-lg font-semibold text-brand-black mb-4">Recent Activity</h3>
        <p className="text-brand-gray text-center py-8">
          No transactions yet. Create your first invoice to get started!
        </p>
      </div>
    </div>
  );
}
```

---

## 3.6 Create Placeholder Pages

### Invoices Page
Create `app/(dashboard)/dashboard/invoices/page.tsx`:

```tsx
export default function InvoicesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-black mb-4">Invoices</h1>
      <p className="text-brand-gray">Invoice management coming in Module 4.</p>
    </div>
  );
}
```

### Withdrawals Page
Create `app/(dashboard)/dashboard/withdrawals/page.tsx`:

```tsx
export default function WithdrawalsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-black mb-4">Withdrawals</h1>
      <p className="text-brand-gray">Withdrawal management coming in Module 6.</p>
    </div>
  );
}
```

### Settings Page
Create `app/(dashboard)/dashboard/settings/page.tsx`:

```tsx
export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-black mb-4">Settings</h1>
      <p className="text-brand-gray">Settings coming in Module 7.</p>
    </div>
  );
}
```

---

## Verification Checklist

Before moving to Module 4:

- [ ] Sidebar displays correctly with navigation items
- [ ] Active navigation item is highlighted
- [ ] User info shows in sidebar footer
- [ ] Sign out works from sidebar
- [ ] Balance card displays (shows $0.00 initially)
- [ ] Quick action buttons link to correct pages
- [ ] All placeholder pages are accessible
- [ ] Mobile responsiveness is acceptable

---

**Next Module**: [04-invoices-module.md](./04-invoices-module.md) - Invoice creation and management
