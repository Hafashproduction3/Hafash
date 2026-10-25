import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev',
        port: '',
        pathname: '/**',
      },
      // 👇 YEH 2 DOMAINS MAIN NAYE ADD KIYE HAIN 👇
      {
        protocol: 'https',
        hostname: 'hafash-storage.9f6e5afede18c219a4b2bf07af49d55f.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-e2f68400ff8d4c72ae59bfb7f78a2.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;