import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EscrowReleaseSchema, getAuthContext, releaseEscrowFunds } from '@/app/api/routes-d/escrow/_shared'
import { sendEscrowReleasedEmail } from '@/lib/email'
import { sendUSDCPayment } from '@/lib/stellar'
import { Keypair } from '@stellar/stellar-sdk'
import { processWaterfallPayments } from '@/lib/waterfall'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: 401 })

    const body = await request.json()
    const parsed = EscrowReleaseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 })

    const { invoiceId, clientEmail, approvalNotes } = parsed.data

    // Prevent spoofing
    if (clientEmail.toLowerCase() !== auth.email.toLowerCase()) {
      return NextResponse.json({ error: 'clientEmail must match authenticated user email' }, { status: 403 })
    }

    // Fetch invoice with collaborators and user wallet for waterfall distribution
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: { include: { wallet: true } },
        collaborators: true,
      },
    })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    if (invoice.clientEmail.toLowerCase() !== clientEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized (client email mismatch)' }, { status: 403 })
    }

    if (!invoice.escrowEnabled) return NextResponse.json({ error: 'Escrow is not enabled for this invoice' }, { status: 400 })
    if (invoice.escrowStatus !== 'held') return NextResponse.json({ error: `Invalid escrow status: ${invoice.escrowStatus}` }, { status: 400 })

    // Derive funding wallet from env — fail fast before any on-chain or DB work
    const fundingSecret = process.env.STELLAR_FUNDING_WALLET_SECRET
    if (!fundingSecret) {
      logger.error({}, 'STELLAR_FUNDING_WALLET_SECRET is not configured')
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }
    const fundingPublicKey = Keypair.fromSecret(fundingSecret).publicKey()

    const hasCollaborators = invoice.collaborators.length > 0
    const amountUsdc = Number(invoice.amount)

    // On-chain Soroban release (before DB transaction — cannot be rolled back)
    if (invoice.escrowContractId) {
      try {
        await releaseEscrowFunds(invoice.escrowContractId)
      } catch (err) {
        logger.error({ err }, 'On-chain escrow release failed:')
        return NextResponse.json({ error: 'Failed to release escrow on-chain. Please ensure you have sufficient XLM for gas.' }, { status: 500 })
      }
    }

    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomic escrow + invoice status update with optimistic lock
      const updateResult = await tx.invoice.updateMany({
        where: {
          id: invoice.id,
          escrowEnabled: true,
          escrowStatus: 'held',
          clientEmail: invoice.clientEmail,
        },
        data: {
          escrowStatus: 'released',
          status: 'paid',
          escrowReleasedAt: now,
        },
      })

      if (updateResult.count !== 1) {
        throw new Error('ESCROW_RELEASE_CONFLICT')
      }

      // 2. Audit trail
      await tx.escrowEvent.create({
        data: {
          invoiceId: invoice.id,
          eventType: 'released',
          actorType: 'client',
          actorEmail: clientEmail,
          notes: approvalNotes || 'Client approved work and released escrow',
        },
      })

      let distributions: Awaited<ReturnType<typeof processWaterfallPayments>>['distributions'] = []

      if (!hasCollaborators) {
        // Scenario A — No collaborators: send full amount to freelancer
        const freelancerWallet = invoice.user.wallet?.address
        if (!freelancerWallet) throw new Error('Freelancer wallet not configured')

        await sendUSDCPayment(
          fundingPublicKey,
          fundingSecret,
          freelancerWallet,
          amountUsdc.toFixed(7),
          `Escrow payout: ${invoice.invoiceNumber}`
        )
      } else {
        // Scenario B — Collaborators exist: waterfall distribution
        const waterfallResult = await processWaterfallPayments(invoice.id, amountUsdc, 'escrow', tx)
        distributions = waterfallResult.distributions

        const freelancerWallet = invoice.user.wallet?.address
        if (!freelancerWallet) throw new Error('Freelancer wallet not configured')

        // Send lead share to invoice owner
        await sendUSDCPayment(
          fundingPublicKey,
          fundingSecret,
          freelancerWallet,
          waterfallResult.leadShare.toFixed(7),
          `Escrow lead share: ${invoice.invoiceNumber}`
        )

        // Send each collaborator's share; skip failed entries (no wallet / DB error)
        for (const dist of waterfallResult.distributions) {
          if (dist.status === 'completed' && dist.walletAddress) {
            try {
              await sendUSDCPayment(
                fundingPublicKey,
                fundingSecret,
                dist.walletAddress,
                dist.amount.toFixed(7),
                `Revenue split: ${invoice.invoiceNumber}`
              )
            } catch (err) {
              // Individual collaborator payment failure does not abort the transaction
              logger.error({ err, collaboratorEmail: dist.email }, 'Collaborator payment failed — skipping')
            }
          }
        }
      }

      return { distributions }
    })

    // Send confirmation email to the invoice owner
    if (invoice.user.email) {
      await sendEscrowReleasedEmail({
        to: invoice.user.email,
        invoiceNumber: invoice.invoiceNumber,
        clientEmail,
        notes: approvalNotes,
      })
    }

    return NextResponse.json({
      success: true,
      message: hasCollaborators
        ? `Escrow released with waterfall to ${invoice.collaborators.length} collaborators`
        : 'Escrow released to freelancer',
      distributions: result.distributions,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'ESCROW_RELEASE_CONFLICT') {
      return NextResponse.json({ error: 'Escrow status changed. Please refresh and retry.' }, { status: 409 })
    }
    logger.error({ err: error }, 'Escrow release error:')
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to release escrow' }, { status: 500 })
  }
}
