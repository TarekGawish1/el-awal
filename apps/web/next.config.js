/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  // Limit in-memory SSR and page cache to 25MB to prevent Heroku 512MB RAM OOM crashes (R14/R15)
  cacheMaxMemorySize: 25 * 1024 * 1024,

  // Reduce server bundle size by externalizing large native packages
  serverExternalPackages: ['sharp'],

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.al-awal.online',
          },
        ],
        destination: 'https://al-awal.online/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '.*\\.herokuapp\\.com',
          },
        ],
        destination: 'https://al-awal.online/:path*',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    const rawBackendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1');

    let backendUrl = rawBackendUrl.replace(/\/$/, '');
    // Guard against localhost and self-referential rewrites
    if (
      backendUrl.includes('localhost:3000') ||
      backendUrl === 'https://al-awal.online/api/v1' ||
      backendUrl === 'https://al-awal.online' ||
      !backendUrl.startsWith('http')
    ) {
      backendUrl = 'https://al-awal-cbe2188d9efa.herokuapp.com/api/v1';
    }

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
      '@tanstack/react-query',
    ],
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
        value: 'camera=(self), microphone=(), geolocation=()',
      },
      {
        // Keep permissive enough for Next.js hydration, Google Fonts,
        // R2 media, backend APIs and embedded lesson videos (YouTube/Vimeo).
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval'" : ''} https://fastly.jsdelivr.net https://*.jsdelivr.net https://www.youtube.com https://s.ytimg.com https://www.clarity.ms https://scripts.clarity.ms https://static.cloudflareinsights.com https://assets.mediadelivery.net https://*.mediadelivery.net https://player.mediadelivery.net`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https: https://c.clarity.ms https://*.clarity.ms",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://api.al-awal.online wss://api.al-awal.online https://al-awal-cbe2188d9efa.herokuapp.com wss://al-awal-cbe2188d9efa.herokuapp.com https://pub-e729d46cf5fd4798932ccae48f7361ef.r2.dev https://*.r2.dev https://fastly.jsdelivr.net https://*.jsdelivr.net https://www.clarity.ms https://*.clarity.ms https://ipwho.is https://static.cloudflareinsights.com https://cloudflareinsights.com https://video.bunnycdn.com https://*.mediadelivery.net https://player.mediadelivery.net https://*.b-cdn.net",
          "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.mediadelivery.net https://player.mediadelivery.net https://*.mediadelivery.net https://video.bunnycdn.com https://*.b-cdn.net",
          "media-src 'self' blob: data: https: https://*.b-cdn.net https://*.mediadelivery.net https://player.mediadelivery.net",
          "worker-src 'self' blob:",
          "child-src 'self' blob: https://player.mediadelivery.net https://iframe.mediadelivery.net https://*.mediadelivery.net https://*.b-cdn.net",
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
        source: '/certification-bg.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/about-us-v2/:path*',
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
      {
        source: '/(favicon.ico|favicon.svg|icon.svg|apple-touch-icon.png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(manifest.json|manifest.webmanifest)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/offline.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
