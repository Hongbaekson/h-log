import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/projects",
        destination: "/portfolio",
        permanent: true,
      },
      {
        source: "/projects/:slug",
        destination: "/portfolio/:slug",
        permanent: true,
      },
    ];
  },
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
