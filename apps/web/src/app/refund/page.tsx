import { Metadata } from 'next';
import { RefundPolicyView } from '@/features/legal/components/RefundPolicyView';

export const metadata: Metadata = {
  title: 'سياسة الاسترداد والإلغاء | منصة الأول التعليمية',
  description: 'سياسة وضوابط استرداد الرسوم الدراسية وإلغاء الاشتراكات للكورسات وحصص السنتر في منصة الأول التعليمية.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return <RefundPolicyView />;
}
