import { Metadata } from 'next';
import PageClient from './page-client';

export const metadata: Metadata = {
  title: 'منصة الأول التعليمية | استاذ أحمد غريب',
  description: 'نظام إدارة التعليم وحصص الحضور الذكي والتقييمات للطلاب والمدرسين',
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
