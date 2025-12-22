import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const event = JSON.parse(body)
  
  if (event.type !== 'user.created') {
    return NextResponse.json({ received: true })
  }

  const { id: privyId, email, wallet } = event.data

  await prisma.user.upsert({
    where: { privyId },
    update: {},
    create: {
      privyId,
      email: email?.address || '',
      wallet: wallet?.address ? { create: { address: wallet.address } } : undefined,
    },
  })

  return NextResponse.json({ received: true })
}
