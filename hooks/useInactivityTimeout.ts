'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'

const TIMEOUT = 20 * 60 * 1000 // 20 minutes

export function useInactivityTimeout() {
  const { logout, authenticated } = usePrivy()

  useEffect(() => {
    if (!authenticated) return

    let timer: NodeJS.Timeout

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        logout()
        toast.error('Session expired due to inactivity')
      }, TIMEOUT)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(timer)
    }
  }, [authenticated, logout])
}

