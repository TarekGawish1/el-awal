import { Metadata } from 'next';
import PageClient from './page-client';

export const metadata: Metadata = {
  title: 'منصة الأول التعليمية | أستاذ أحمد غريب',
  description:
    'منصة الأول الأستاذ أحمد غريب في الرياضيات، تقدم للطلاب متابعة الحصص والتقييمات والواجبات والنتائج في مكان واحد.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export default function Page() {
  return <PageClient />;
}