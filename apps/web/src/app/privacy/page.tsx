import { Metadata } from 'next';
import { PrivacyPolicyView } from '@/features/legal/components/PrivacyPolicyView';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | منصة الأول التعليمية',
  description: 'سياسة الخصوصية وحماية البيانات الشخصية لمنصة الأول التعليمية وفقاً للأنظمة والتشريعات المعمول بها.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return <PrivacyPolicyView />;
}
