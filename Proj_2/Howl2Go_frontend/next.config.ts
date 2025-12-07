import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Enable standalone build for Docker
  
  // Fix workspace root warning by explicitly setting the root directory
  outputFileTracingRoot: path.join(__dirname, '../..'),
  
  // Turbopack configuration (if using Turbopack)
  experimental: {
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;
