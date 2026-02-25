import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // CSP with dynamic nonce is handled entirely in middleware.ts
  // Only keep headers that are truly static and don't require a nonce
  async headers() {
    return [];
  },
};

export default nextConfig;
