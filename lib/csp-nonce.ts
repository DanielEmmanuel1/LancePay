import { headers } from 'next/headers';

/**
 * Get the CSP nonce for inline scripts and styles.
 * Generated per-request by middleware.ts and passed via x-nonce header.
 *
 * Usage in Server Components:
 * const nonce = await getNonce();
 *
 * Usage in JSX:
 * <script nonce={nonce}>{inlineCode}</script>
 */
export async function getNonce(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-nonce') || '';
}
