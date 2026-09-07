import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PwaRegister, PwaInstallPrompt } from '@/components/pwa';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-cairo',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Handles notch / safe area insets on iOS & Android
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`}>
      <head>
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
