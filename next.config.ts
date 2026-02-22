import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // CSP with dynamic nonce is handled entirely in middleware.ts
  // Only keep headers that are truly static and don't require a nonce
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Add any static, non-CSP headers here if needed
          // e.g. frame-ancestors for SEP-24 anchor embedding
          // { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://*.moneygram.com" }
        ],
      },
    ];
  },
};

export default nextConfig;
