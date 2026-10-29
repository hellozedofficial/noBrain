import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/canvas",
        destination: "/canvas/index.html",
      },
    ]
  },
};

export default nextConfig;
