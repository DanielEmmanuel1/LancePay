import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function verifyAuthToken(token: string) {
  try {
    return await privy.verifyAuthToken(token)
  } catch {
    return null
  }
}
