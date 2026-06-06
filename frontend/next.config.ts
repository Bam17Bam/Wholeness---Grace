import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Asset prefix for CDN deployment (if any)
  // assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Image optimization config
  images: {
    remotePatterns: [
      // Add any external image domains here
      // {
      //   protocol: 'https',
      //   hostname: '**.example.com',
      // },
    ],
  },

  // Disable linting and type checking during build for faster production builds
  // (Assuming these are handled in CI)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
