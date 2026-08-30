import { Metadata } from 'next';
import { CertificatesClient } from '@/features/certificates/components/CertificatesClient';

export const metadata: Metadata = {
  title: 'الشهادات | منصة الأول',
  description: 'إدارة وإنشاء شهادات الطلاب',
};

export default function CertificatesPage() {
  return <CertificatesClient />;
}
