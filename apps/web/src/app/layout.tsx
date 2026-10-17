import React from 'react';
import { Cairo } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PwaRegister, PwaInstallPrompt } from '@/components/pwa';
import { ClarityProvider } from '@/components/analytics/ClarityProvider';
import { CookieConsentBanner } from '@/components/analytics/CookieConsentBanner';

export { viewport, metadata } from './metadata.config';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-cairo',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="الأول" />
      </head>
      <body className="bg-neutral-50 text-neutral-900 min-h-screen flex flex-col antialiased no-scrollbar">
        <Providers>
          <ClarityProvider />
          <CookieConsentBanner />
          {children}
          <PwaRegister />
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
