import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WSL 优化配置
  webpack: (config, { dev }) => {
    if (dev) {
      // 减少文件监听负载,防止 WSL 连接断开
      config.watchOptions = {
        poll: 1000, // 使用轮询而不是文件系统事件
        aggregateTimeout: 300, // 延迟重新构建
        ignored: /node_modules/, // 忽略 node_modules
      };
    }
    return config;
  },
  // 优化开发服务器性能
  experimental: {
    // 减少内存占用
    webpackBuildWorker: true,
  },
};

export default nextConfig;
