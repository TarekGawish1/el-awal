import { Metadata } from 'next';
import { CookiePolicyView } from '@/features/legal/components/CookiePolicyView';

export const metadata: Metadata = {
  title: 'سياسة ملفات تعريف الارتباط (Cookies) | منصة الأول التعليمية',
  description: 'سياسة استخدام ملفات تعريف الارتباط وتفضيلات التتبع لمنصة الأول التعليمية.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesPolicyPage() {
  return <CookiePolicyView />;
}
