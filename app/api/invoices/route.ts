import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'
import { createInvoiceSchema } from '@/lib/validations'
import { generateInvoiceNumber } from '@/lib/utils'

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

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invoices })
}

export async function POST(request: NextRequest) {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const claims = await verifyAuthToken(authToken)
  if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const user = await prisma.user.upsert({
    where: { privyId: claims.userId },
    update: {},
    create: { privyId: claims.userId, email: (claims as any).email || '' },
  })

  const body = await request.json()
  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { clientEmail, clientName, description, amount, dueDate } = parsed.data
  const invoiceNumber = generateInvoiceNumber()
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceNumber}`

  const invoice = await prisma.invoice.create({
    data: { userId: user.id, invoiceNumber, clientEmail, clientName, description, amount, dueDate: dueDate ? new Date(dueDate) : null, paymentLink },
  })

  return NextResponse.json(invoice, { status: 201 })
}
