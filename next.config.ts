// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices to access the dev server
  allowedDevOrigins: ['192.168.1.64', 'localhost', '192.168.1.*'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // API routes handle large base64 images — relax body size limit
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

