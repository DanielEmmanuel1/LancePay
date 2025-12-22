import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const event = JSON.parse(body)
    
    console.log('Privy webhook received:', event.type, JSON.stringify(event, null, 2))
    
    // Ignore test events
    if (event.type === 'privy.test') {
      console.log('Test event received, ignoring')
      return NextResponse.json({ received: true })
    }
    
    // Handle user.created event
    if (event.type === 'user.created') {
      // Privy sends user data directly or nested in 'user' field
      const userData = event.data?.user || event.data
      const privyId = userData?.id
      const email = userData?.email?.address || ''
      const linkedAccounts = userData?.linked_accounts || []
      
      if (!privyId) {
        console.log('No privyId found in event, skipping')
        return NextResponse.json({ received: true })
      }
      
      console.log('User created event - privyId:', privyId, 'email:', email)
      
      // Find embedded wallet
      const embeddedWallet = linkedAccounts.find(
        (account: any) => 
          account.type === 'wallet' && 
          (account.wallet_client_type === 'privy' || account.walletClientType === 'privy')
      )
      
      const walletAddress = embeddedWallet?.address
      console.log('Found embedded wallet:', walletAddress || 'none')
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { privyId } })
      
      if (existingUser) {
        // Update existing user with wallet if needed
        if (walletAddress) {
          await prisma.wallet.upsert({
            where: { userId: existingUser.id },
            create: { userId: existingUser.id, address: walletAddress },
            update: { address: walletAddress }
          })
        }
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            privyId,
            email: email || `${privyId}@privy.local`, // Fallback email to avoid conflicts
            wallet: walletAddress ? { create: { address: walletAddress } } : undefined,
          },
        })
      }
      
      console.log('User processed successfully:', privyId)
    }
    
    // Handle user.linked_account event (wallet created after signup)
    if (event.type === 'user.linked_account') {
      const userData = event.data?.user || event.data
      const privyId = userData?.id
      const linkedAccount = event.data?.linked_account
      
      if (!privyId) {
        console.log('No privyId found in linked_account event, skipping')
        return NextResponse.json({ received: true })
      }
      
      console.log('Linked account event - privyId:', privyId)
      
      const isEmbeddedWallet = linkedAccount?.type === 'wallet' && 
        (linkedAccount?.wallet_client_type === 'privy' || linkedAccount?.walletClientType === 'privy')
      
      if (isEmbeddedWallet && linkedAccount?.address) {
        const user = await prisma.user.findUnique({ 
          where: { privyId },
          include: { wallet: true }
        })
        
        if (user && !user.wallet) {
          await prisma.wallet.create({
            data: {
              userId: user.id,
              address: linkedAccount.address,
            }
          })
          console.log('Wallet added for existing user:', privyId)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Privy webhook error:', error)
    return NextResponse.json({ received: true }) // Return 200 to prevent Privy retries
  }
}
