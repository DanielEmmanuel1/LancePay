import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    rate: 1600,
    currency: 'NGN',
    updatedAt: new Date().toISOString(),
  })
}
