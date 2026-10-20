import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      { source: "/demo/shop", destination: "/demo", permanent: false },
      { source: "/demo/shop/:path*", destination: "/demo/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
