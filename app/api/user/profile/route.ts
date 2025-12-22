import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const claims = await verifyAuthToken(authToken || '')
    if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // First try to find existing user
    let user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    })

    // If not found, create with a unique email
    if (!user) {
      const email = (claims as any).email || `${claims.userId}@privy.local`
      user = await prisma.user.create({
        data: { 
          privyId: claims.userId, 
          email: email,
        },
        select: { id: true, email: true, name: true, phone: true, createdAt: true },
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const claims = await verifyAuthToken(authToken || '')
    if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, phone } = await request.json()
    
    // First try to find existing user
    let user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
    })

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { privyId: claims.userId },
        data: { name, phone },
      })
    } else {
      // Create new user
      const email = (claims as any).email || `${claims.userId}@privy.local`
      user = await prisma.user.create({
        data: { 
          privyId: claims.userId, 
          email: email,
          name, 
          phone 
        },
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
