
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
    ],
  },
  // In this environment, Next.js 15 requires allowedDevOrigins to be within the experimental block
  // to resolve the HMR cross-origin blocking issue and invalid-next-config warning.
  experimental: {
    allowedDevOrigins: [
      '6000-firebase-studio-1782069807238.cluster-wurh6gchdjcjmwrw2tqtufvhss.cloudworkstations.dev',
      '9000-firebase-studio-1782069807238.cluster-wurh6gchdjcjmwrw2tqtufvhss.cloudworkstations.dev',
      '9002-firebase-studio-1782069807238.cluster-wurh6gchdjcjmwrw2tqtufvhss.cloudworkstations.dev'
    ]
  }
};

export default nextConfig;
