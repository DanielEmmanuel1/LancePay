import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/routes-d/escrow/release/route'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    invoiceCollaborator: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    escrowEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/app/api/routes-d/escrow/_shared', () => ({
  EscrowReleaseSchema: {
    safeParse: vi.fn((body) => ({ success: true, data: body })),
  },
  getAuthContext: vi.fn().mockResolvedValue({
    email: 'client@example.com',
    privyId: 'privy-client-1',
  }),
  releaseEscrowFunds: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/stellar', () => ({
  sendUSDCPayment: vi.fn().mockResolvedValue('mock-tx-hash'),
}))

vi.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromSecret: vi.fn().mockReturnValue({
      publicKey: () => 'FUNDING_PUBLIC_KEY',
    }),
  },
}))

vi.mock('@/lib/email', () => ({
  sendEscrowReleasedEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FREELANCER_WALLET = 'GFREELANCER000000000000000000000000000000000000000000000001'
const COLLABORATOR_WALLET = 'GCOLLABORATOR00000000000000000000000000000000000000000000001'

function makeRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/routes-d/escrow/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    userId: 'user-freelancer',
    clientEmail: 'client@example.com',
    amount: '1000',
    escrowEnabled: true,
    escrowStatus: 'held',
    escrowContractId: null,
    status: 'pending',
    user: {
      email: 'freelancer@example.com',
      wallet: { address: FREELANCER_WALLET },
    },
    collaborators: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Escrow Release with Collaborators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STELLAR_FUNDING_WALLET_SECRET = 'SFUNDINGWALLETSECRETSEED000000000000000000000000000000001'

    // Default $transaction implementation: run the callback with a fake tx
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const fakeTx = {
        invoice: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn(),
        },
        invoiceCollaborator: {
          findMany: vi.fn(),
          update: vi.fn(),
        },
        escrowEvent: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(fakeTx)
    })
  })

  // -------------------------------------------------------------------------
  // Test 1 — 70 / 30 split when collaborators exist
  // -------------------------------------------------------------------------
  it('should distribute funds via waterfall when collaborators exist', async () => {
    const { sendUSDCPayment } = await import('@/lib/stellar')

    const collaborator = {
      id: 'collab-1',
      invoiceId: 'invoice-1',
      subContractorId: 'sub-1',
      sharePercentage: '30',
      payoutStatus: 'pending',
      subContractor: {
        id: 'sub-1',
        email: 'sub@example.com',
        wallet: { address: COLLABORATOR_WALLET },
      },
    }

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(
      makeInvoice({ collaborators: [collaborator] }) as any
    )

    // processWaterfallPayments reads collaborators via db.invoiceCollaborator.findMany
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const fakeTx = {
        invoice: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        invoiceCollaborator: {
          findMany: vi.fn().mockResolvedValue([collaborator]),
          update: vi.fn().mockResolvedValue(collaborator),
        },
        escrowEvent: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(fakeTx)
    })

    const req = makeRequest({ invoiceId: 'invoice-1', clientEmail: 'client@example.com' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toMatch(/waterfall/)

    // sendUSDCPayment should be called twice:
    // 1. freelancer lead share (700)
    // 2. collaborator share (300)
    const calls = vi.mocked(sendUSDCPayment).mock.calls
    expect(calls).toHaveLength(2)

    const freelancerCall = calls.find((c) => c[2] === FREELANCER_WALLET)
    expect(freelancerCall).toBeDefined()
    expect(parseFloat(freelancerCall![3])).toBeCloseTo(700, 2) // 70%

    const collaboratorCall = calls.find((c) => c[2] === COLLABORATOR_WALLET)
    expect(collaboratorCall).toBeDefined()
    expect(parseFloat(collaboratorCall![3])).toBeCloseTo(300, 2) // 30%
  })

  // -------------------------------------------------------------------------
  // Test 2 — Full amount to freelancer when no collaborators
  // -------------------------------------------------------------------------
  it('should send full amount when no collaborators', async () => {
    const { sendUSDCPayment } = await import('@/lib/stellar')

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(
      makeInvoice({ collaborators: [] }) as any
    )

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const fakeTx = {
        invoice: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        invoiceCollaborator: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
        escrowEvent: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(fakeTx)
    })

    const req = makeRequest({ invoiceId: 'invoice-1', clientEmail: 'client@example.com' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Escrow released to freelancer')

    // Exactly one payment call for the full amount to the freelancer
    const calls = vi.mocked(sendUSDCPayment).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0][2]).toBe(FREELANCER_WALLET)
    expect(parseFloat(calls[0][3])).toBeCloseTo(1000, 2)
  })

  // -------------------------------------------------------------------------
  // Test 3 — Partial failure: collaborator with no wallet fails gracefully
  // -------------------------------------------------------------------------
  it('should handle partial collaborator payment failures', async () => {
    const { sendUSDCPayment } = await import('@/lib/stellar')

    const collab1 = {
      id: 'collab-1',
      invoiceId: 'invoice-1',
      subContractorId: 'sub-1',
      sharePercentage: '20',
      payoutStatus: 'pending',
      subContractor: {
        id: 'sub-1',
        email: 'sub1@example.com',
        wallet: { address: COLLABORATOR_WALLET },
      },
    }

    // collab2 has no wallet — processWaterfallPayments will mark it failed
    // because db.update throws when paymentSource is set on a model that
    // simulates a write error (we force this via the mock)
    const collab2 = {
      id: 'collab-2',
      invoiceId: 'invoice-1',
      subContractorId: 'sub-2',
      sharePercentage: '30',
      payoutStatus: 'pending',
      subContractor: {
        id: 'sub-2',
        email: 'sub2@example.com',
        wallet: null, // no wallet
      },
    }

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(
      makeInvoice({ collaborators: [collab1, collab2] }) as any
    )

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const fakeTx = {
        invoice: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        invoiceCollaborator: {
          findMany: vi.fn().mockResolvedValue([collab1, collab2]),
          update: vi
            .fn()
            // collab1 update succeeds
            .mockResolvedValueOnce(collab1)
            // collab2 update throws to simulate DB/write failure
            .mockRejectedValueOnce(new Error('Collaborator wallet not found'))
            // fallback failed-status update for collab2
            .mockResolvedValueOnce({ ...collab2, payoutStatus: 'failed' }),
        },
        escrowEvent: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(fakeTx)
    })

    const req = makeRequest({ invoiceId: 'invoice-1', clientEmail: 'client@example.com' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.distributions).toHaveLength(2)

    const completedDist = json.distributions.find((d: any) => d.status === 'completed')
    const failedDist = json.distributions.find((d: any) => d.status === 'failed')

    expect(completedDist).toBeDefined()
    expect(completedDist.email).toBe('sub1@example.com')

    expect(failedDist).toBeDefined()
    expect(failedDist.email).toBe('sub2@example.com')

    // sendUSDCPayment should be called for: freelancer lead share + collab1 (completed)
    // collab2 is skipped because walletAddress is empty string
    const usdcCalls = vi.mocked(sendUSDCPayment).mock.calls
    // At minimum: freelancer lead share
    const freelancerCall = usdcCalls.find((c) => c[2] === FREELANCER_WALLET)
    expect(freelancerCall).toBeDefined()
  })
})
