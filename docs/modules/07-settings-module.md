# Module 7: Settings

> **Prerequisite**: Complete Module 6 (Withdrawals) first

This module implements user profile settings and bank account management UI.

---

## 7.1 Profile API

Create `app/api/user/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth';

// GET - Get user profile
export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const claims = await verifyAuthToken(authToken || '');
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { privyId: claims.userId },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  });

  return NextResponse.json(user);
}

// PUT - Update profile
export async function PUT(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const claims = await verifyAuthToken(authToken || '');
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, phone } = await request.json();

  const user = await prisma.user.update({
    where: { privyId: claims.userId },
    data: { name, phone },
  });

  return NextResponse.json(user);
}
```

---

## 7.2 Settings Page

Update `app/(dashboard)/dashboard/settings/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export default function SettingsPage() {
  const { getAccessToken } = usePrivy();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getAccessToken();
      
      // Fetch profile
      const profileRes = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile({ name: data.name || '', phone: data.phone || '' });
      }

      // Fetch bank accounts
      const banksRes = await fetch('/api/bank-accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (banksRes.ok) {
        const data = await banksRes.json();
        setBankAccounts(data.bankAccounts);
      }

      setIsLoading(false);
    }
    load();
  }, [getAccessToken]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const token = await getAccessToken();
    await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(profile),
    });
    setIsSaving(false);
    alert('Profile saved!');
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-brand-black">Settings</h1>

      {/* Profile Section */}
      <section className="bg-white rounded-xl border border-brand-border p-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="+234..."
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-4 py-2 bg-brand-black text-white rounded-lg"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* Bank Accounts Section */}
      <section className="bg-white rounded-xl border border-brand-border p-6">
        <h2 className="text-lg font-semibold mb-4">Bank Accounts</h2>
        {bankAccounts.length === 0 ? (
          <p className="text-brand-gray">No bank accounts added yet.</p>
        ) : (
          <ul className="space-y-2">
            {bankAccounts.map((bank: any) => (
              <li key={bank.id} className="p-3 bg-brand-light rounded-lg">
                <p className="font-medium">{bank.bankName}</p>
                <p className="text-sm text-brand-gray">
                  {bank.accountName} • ****{bank.accountNumber.slice(-4)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {/* Add bank account button - links to withdrawals page */}
      </section>
    </div>
  );
}
```

---

## Verification Checklist

- [ ] Profile loads with existing data
- [ ] Can update name and phone
- [ ] Bank accounts list displays
- [ ] Changes persist after refresh

---

## Module Implementation Complete! 🎉

You have completed all 7 module documentation guides:

1. ✅ **Foundation** - Dependencies, Prisma, folder structure
2. ✅ **Auth** - Privy, Google OAuth, embedded wallets
3. ✅ **Dashboard** - Layout, sidebar, balance display
4. ✅ **Invoices** - CRUD, payment links
5. ✅ **Payments** - Public payment page
6. ✅ **Withdrawals** - Bank accounts, NGN withdrawals
7. ✅ **Settings** - Profile management

---

## Next Steps

1. Follow Module 1 to set up foundation
2. Implement each module in order
3. Test at each verification checkpoint
4. Deploy when all modules complete
