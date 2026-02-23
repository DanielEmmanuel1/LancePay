import type { NextRequest } from 'next/server'

type RateLimitPolicy = {
  id: string
  pathPrefixes: string[]
  methods: string[]
  maxRequests: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

export type RequestRateLimitResult = {
  policyId: string
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

const POLICIES: RateLimitPolicy[] = [
  {
    id: 'api-pay',
    pathPrefixes: ['/api/pay'],
    methods: ['GET', 'POST'],
    maxRequests: 60,
    windowMs: 60_000,
  },
  {
    id: 'api-auth',
    pathPrefixes: ['/api/auth', '/api/sep24/auth'],
    methods: ['GET', 'POST'],
    maxRequests: 30,
    windowMs: 60_000,
  },
]

const globalStore = globalThis as typeof globalThis & {
  __lancepayRateLimitStore?: Map<string, RateLimitEntry>
}

const STORE = globalStore.__lancepayRateLimitStore ?? new Map<string, RateLimitEntry>()
if (!globalStore.__lancepayRateLimitStore) {
  globalStore.__lancepayRateLimitStore = STORE
}

function findPolicy(pathname: string, method: string): RateLimitPolicy | null {
  const upperMethod = method.toUpperCase()
  for (const policy of POLICIES) {
    if (!policy.methods.includes(upperMethod)) continue
    if (policy.pathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return policy
    }
  }
  return null
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim()
    if (ip) return ip
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp

  return 'anonymous'
}

function cleanupExpiredEntries(now: number) {
  if (STORE.size < 5000) return
  for (const [key, value] of STORE.entries()) {
    if (value.resetAt <= now) {
      STORE.delete(key)
    }
  }
}

export function checkRequestRateLimit(request: NextRequest): RequestRateLimitResult | null {
  const policy = findPolicy(request.nextUrl.pathname, request.method)
  if (!policy) return null

  const now = Date.now()
  cleanupExpiredEntries(now)

  const identifier = getClientIdentifier(request)
  const key = `${policy.id}:${identifier}`
  const existing = STORE.get(key)

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + policy.windowMs
    STORE.set(key, { count: 1, resetAt })
    return {
      policyId: policy.id,
      allowed: true,
      limit: policy.maxRequests,
      remaining: policy.maxRequests - 1,
      resetAt,
    }
  }

  if (existing.count >= policy.maxRequests) {
    return {
      policyId: policy.id,
      allowed: false,
      limit: policy.maxRequests,
      remaining: 0,
      resetAt: existing.resetAt,
    }
  }

  existing.count += 1
  STORE.set(key, existing)

  return {
    policyId: policy.id,
    allowed: true,
    limit: policy.maxRequests,
    remaining: Math.max(policy.maxRequests - existing.count, 0),
    resetAt: existing.resetAt,
  }
}
