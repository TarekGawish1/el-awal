import { Metadata } from 'next';
import { CertificateBuilder } from '@/features/certificates/components/CertificateBuilder';

export const metadata: Metadata = {
  title: 'إنشاء شهادة جديدة | منصة الأول',
  description: 'إنشاء شهادات تقدير للطلاب',
};

export default function NewCertificatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">إنشاء شهادة جديدة</h1>
        <p className="text-slate-500 mt-1">قم بتعبئة بيانات الطالب لإنشاء شهادة تقدير بصيغة PDF</p>
      </div>

      <CertificateBuilder />
    </div>
  );
}
