import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client", "prisma"],
  allowedDevOrigins: ["192.168.0.20", "192.168.0.21"],
};

export default nextConfig;
