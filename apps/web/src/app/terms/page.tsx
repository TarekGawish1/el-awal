import { Metadata } from 'next';
import { TermsOfServiceView } from '@/features/legal/components/TermsOfServiceView';

export const metadata: Metadata = {
  title: 'شروط الاستخدام والخدمة | منصة الأول التعليمية',
  description: 'اتفاقية شروط الاستخدام وقواعد الملكية الفكرية وحقوق الاستخدام لمنصة الأول التعليمية.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return <TermsOfServiceView />;
}
