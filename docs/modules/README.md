# LancePay Module Implementation Guide

> Step-by-step guide to building FreelancerPay402

---

## Implementation Order

Follow these modules in sequence. Each module builds on the previous one.

| # | Module | Description | Est. Time |
|---|--------|-------------|-----------|
| 1 | [Foundation](./01-foundation.md) | Dependencies, Prisma, folder structure | 2-3 hours |
| 2 | [Authentication](./02-auth-module.md) | Privy, Google OAuth, embedded wallets | 2-3 hours |
| 3 | [Dashboard](./03-dashboard-module.md) | Layout, sidebar, balance display | 2-3 hours |
| 4 | [Invoices](./04-invoices-module.md) | Create/list invoices, payment links | 3-4 hours |
| 5 | [Payments](./05-payments-module.md) | Public payment page (MVP mock) | 2-3 hours |
| 6 | [Withdrawals](./06-withdrawals-module.md) | Bank accounts, NGN withdrawals | 3-4 hours |
| 7 | [Settings](./07-settings-module.md) | Profile management | 1-2 hours |

**Total Estimated Time**: 15-22 hours

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL or Neon account
- [ ] Privy account (https://privy.io)
- [ ] Alchemy account (https://alchemy.com)
- [ ] Read `what-I-am-building.md` (project vision)
- [ ] Read `DEVOPS.md` (infrastructure guide)

---

## Key Principles

### 1. Follow the Order
Each module depends on the previous. Don't skip ahead.

### 2. Complete Verification Checklists
Each module ends with a checklist. Don't proceed until all items are checked.

### 3. MVP First
We're building mock integrations first:
- Mock payment processing (Module 5)
- Mock bank verification (Module 6)
- Hardcoded exchange rates

Real integrations come after MVP is working.

### 4. Test as You Go
After each API route, test with:
- Browser DevTools (Network tab)
- Prisma Studio (database)
- Console logs

---

## Reference Documentation

- [what-I-am-building.md](../what-I-am-building.md) - Full project specification
- [DEVOPS.md](./DEVOPS.md) - Infrastructure and deployment
- [MODULES.md](./MODULES.md) - Architecture overview

---

## Getting Help

If stuck on a module:
1. Check the verification checklist - what failed?
2. Check browser console for errors
3. Check server logs (`npm run dev` output)
4. Check database with `npx prisma studio`

---

**Ready? Start with [Module 1: Foundation](./01-foundation.md)** →
