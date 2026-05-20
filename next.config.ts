// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许局域网内的其他设备访问开发服务器
  allowedDevOrigins: ['192.168.1.64', 'localhost', '192.168.1.*'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // API 路由处理大图片（base64 后会膨胀 33%）需要放宽 body 限制
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

