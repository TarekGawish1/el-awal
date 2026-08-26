import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { PwaRegister, PwaInstallPrompt } from '@/components/pwa';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E4BD9' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1E63' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'منصة الأول التعليمية | لوحة تحكم المدرس',
  description: 'نظام إدارة التعليم وحصص الحضور الذكي والتقييمات للطلاب والمدرسين',
  applicationName: 'منصة الأول التعليمية',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="الأول" />
      </head>
      <body className="bg-neutral-50 text-neutral-900 min-h-screen flex flex-col antialiased no-scrollbar">
        <Providers>
          {children}
          <PwaRegister />
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
