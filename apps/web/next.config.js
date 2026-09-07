/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  experimental: {
    // Tree-shake barrel exports for these heavy packages
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'react-hook-form',
      '@hookform/resolvers',
    ],
    // Reduce server bundle size by externalizing large native packages
    serverComponentsExternalPackages: ['sharp'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-e729d46cf5fd4798932ccae48f7361ef.r2.dev',
      },
    ],
  },
};

module.exports = nextConfig;
