import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    optimizePackageImports: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
