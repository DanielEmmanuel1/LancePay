import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // CSP with dynamic nonce is handled entirely in middleware.ts
  // Only keep headers here if they are truly static and non-empty
};

export default nextConfig;
