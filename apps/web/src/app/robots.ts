import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/teacher/',
        '/student/',
        '/parent/',
        '/login/',
        '/register/',
        '/parent-access/',
        '/export-certs/',
        '/privacy/',
        '/terms/',
        '/api/',
      ],
    },
    sitemap: 'https://al-awal.online/sitemap.xml',
  };
}
