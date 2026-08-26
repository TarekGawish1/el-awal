import type { Metadata, Viewport } from 'next';
import { Inter, Cairo } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['latin', 'arabic'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E4BD9' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1E63' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'منصة الأول التعليمية | El Awal Educational Platform',
    template: '%s | منصة الأول التعليمية',
  },
  description:
    'منصة الأول التعليمية — تعليم حضوري وأونلاين. اكتشف أفضل المدرسين والكورسات في مصر. دروس خصوصية، مجموعات، واختبارات ذكية.',
  applicationName: 'منصة الأول التعليمية',
  keywords: [
    'منصة تعليمية',
    'تعليم أونلاين',
    'دروس خصوصية',
    'مدرسين',
    'كورسات',
    'الأول',
    'El Awal',
    'education',
    'Egypt',
  ],
  authors: [{ name: 'El Awal' }],
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: 'منصة الأول التعليمية',
    title: 'منصة الأول التعليمية | El Awal Educational Platform',
    description:
      'منصة الأول التعليمية — تعليم حضوري وأونلاين. اكتشف أفضل المدرسين والكورسات.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${cairo.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-neutral-50 text-neutral-900 font-sans">
        {children}
      </body>
    </html>
  );
}
