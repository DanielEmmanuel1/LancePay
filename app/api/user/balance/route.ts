import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const claims = await verifyAuthToken(authToken)
  if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const user = await prisma.user.upsert({
    where: { privyId: claims.userId },
    update: {},
    create: { privyId: claims.userId, email: (claims as any).email || '' },
  })

  const paidInvoices = await prisma.invoice.aggregate({
    where: { userId: user.id, status: 'paid' },
    _sum: { amount: true },
  })

  const withdrawals = await prisma.transaction.aggregate({
    where: { userId: user.id, type: 'withdrawal', status: 'completed' },
    _sum: { amount: true },
  })

  const totalIncoming = Number(paidInvoices._sum.amount || 0)
  const totalWithdrawn = Number(withdrawals._sum.amount || 0)
  const usdAmount = totalIncoming - totalWithdrawn
  const exchangeRate = 1600
  const ngnAmount = usdAmount * exchangeRate

  const pendingInvoices = await prisma.invoice.aggregate({
    where: { userId: user.id, status: 'pending' },
    _sum: { amount: true },
  })

  return NextResponse.json({
    available: { amount: usdAmount, currency: 'USD', display: `$${usdAmount.toFixed(2)}` },
    localEquivalent: { amount: ngnAmount, currency: 'NGN', display: `₦${ngnAmount.toLocaleString()}`, rate: exchangeRate },
    pending: { amount: Number(pendingInvoices._sum.amount || 0), currency: 'USD' },
  })
}
