import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const csp = [
    "default-src 'self'",
    "frame-src 'self' https://*.moneygram.com https://stellar.moneygram.com https://*.yellowcard.io https://stellar.yellowcard.io https://*.stellar.org",
    "connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://*.moneygram.com https://stellar.moneygram.com https://*.yellowcard.io https://stellar.yellowcard.io https://api.yellowcard.io",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
