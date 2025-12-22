import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.upsert({
    where: { privyId: claims.userId },
    update: {},
    create: { privyId: claims.userId, email: (claims as any).email || '' },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  })

  return NextResponse.json(user)
}

export async function PUT(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone } = await request.json()
  
  const user = await prisma.user.upsert({
    where: { privyId: claims.userId },
    update: { name, phone },
    create: { privyId: claims.userId, email: (claims as any).email || '', name, phone },
  })

  return NextResponse.json(user)
}
