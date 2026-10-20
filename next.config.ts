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
      { source: "/demo/about", destination: "/demo/shop/about", permanent: false },
      { source: "/demo/checkout", destination: "/demo/shop/checkout", permanent: false },
      { source: "/demo/products/:slug", destination: "/demo/shop/products/:slug", permanent: false },
      { source: "/demo/tournaments", destination: "/demo/shop/tournaments", permanent: false },
      {
        source: "/demo/tournaments/:slug",
        destination: "/demo/shop/tournaments/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
