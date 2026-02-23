import { describe, expect, it } from 'vitest'
import {
  decrypt,
  encrypt,
  generateToken,
  hashToken,
  timingSafeEqual,
} from '@/lib/crypto'

describe('lib/crypto', () => {
  it('encrypts and decrypts text values', () => {
    const plaintext = 'secret-wallet-key'
    const encrypted = encrypt(plaintext)

    expect(encrypted).not.toBe(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it('returns empty values unchanged for encrypt/decrypt', () => {
    expect(encrypt('')).toBe('')
    expect(decrypt('')).toBe('')
  })

  it('compares strings using timing-safe equality', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true)
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false)
    expect(timingSafeEqual('short', 'longer')).toBe(false)
  })

  it('generates a 32-byte hex token', () => {
    const token = generateToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('hashes tokens deterministically', () => {
    const token = 'sample-token'
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/)
  })
})
