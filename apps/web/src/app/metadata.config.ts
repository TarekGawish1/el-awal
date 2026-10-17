import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e40af',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://al-awal.online'),
  title: 'منصة الأول التعليمية | لوحة تحكم المدرس',
  description: 'نظام إدارة التعليم وحصص الحضور الذكي والتقييمات للطلاب والمدرسين',
  applicationName: 'منصة الأول التعليمية',
  robots: {
    index: false,
    follow: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'الأول',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};
