/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  output: 'standalone',

  async rewrites() {
    const rawBackendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1';

    const backendUrl = rawBackendUrl.includes('localhost:3000')
      ? 'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1'
      : rawBackendUrl.replace(/\/$/, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  
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

  async headers() {
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        // Keep permissive enough for Next.js hydration, Google Fonts,
        // R2 media, backend APIs and embedded lesson videos (YouTube/Vimeo).
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://www.youtube.com https://s.ytimg.com https://www.clarity.ms https://scripts.clarity.ms https://static.cloudflareinsights.com https://assets.mediadelivery.net https://*.mediadelivery.net`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https: https://c.clarity.ms https://*.clarity.ms",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://api.al-awal.online wss://api.al-awal.online https://al-awal-cbe2188d9efa.herokuapp.com wss://al-awal-cbe2188d9efa.herokuapp.com https://pub-e729d46cf5fd4798932ccae48f7361ef.r2.dev https://*.r2.dev https://www.clarity.ms https://*.clarity.ms https://ipwho.is https://static.cloudflareinsights.com https://cloudflareinsights.com https://video.bunnycdn.com https://*.mediadelivery.net https://*.b-cdn.net",
          "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.mediadelivery.net https://*.mediadelivery.net https://video.bunnycdn.com https://*.b-cdn.net",
          "media-src 'self' blob: data: https: https://*.b-cdn.net https://*.mediadelivery.net",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          ...(isDev ? [] : ['upgrade-insecure-requests']),
        ].filter(Boolean).join('; '),
      },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Long-lived immutable cache for versioned/static assets (was 4h via origin)
      {
        source: '/hero-animation/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/teacher-photo.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/noise.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
