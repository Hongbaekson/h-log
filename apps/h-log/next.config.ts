import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  async rewrites() {
    return {
      beforeFiles: [
        {
          destination: "/blog-markdown/:slug",
          source: "/blog/:slug.md",
        },
      ],
    };
  },
};

export default nextConfig;
