
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
  // Required for Next.js 15+ in Cloud Workstations to enable HMR and dev resources
  // In Next 15, this is a top-level property.
  allowedDevOrigins: [
    '6000-firebase-studio-1782069807238.cluster-wurh6gchdjcjmwrw2tqtufvhss.cloudworkstations.dev',
    '9000-firebase-studio-1782069807238.cluster-wurh6gchdjcjmwrw2tqtufvhss.cloudworkstations.dev',
    '9002-firebase-studio-1782069807238.cluster-wurh6gchdjcjmwrw2tqtufvhss.cloudworkstations.dev'
  ]
};

export default nextConfig;
