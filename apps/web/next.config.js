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
  },
};

module.exports = nextConfig;
