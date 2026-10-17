import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const AssessmentWizard = dynamic(
  () => import('@/features/assessments/components/AssessmentWizard').then((mod) => mod.AssessmentWizard),
  {
    loading: () => (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-600">جاري تحميل معالج الاختبارات...</p>
      </div>
    ),
  }
);


export const metadata: Metadata = {
  title: 'إنشاء اختبار جديد | منصة الأول',
  description: 'إنشاء اختبار جديد وإضافة الأسئلة',
};

interface PageProps {
  searchParams: { type?: string };
}

export default function CreateAssessmentPage({ searchParams }: PageProps) {
  const isAssignment = searchParams.type === 'ASSIGNMENT';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isAssignment ? 'إنشاء واجب جديد' : 'إنشاء اختبار جديد'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isAssignment
            ? 'اتبع الخطوات لإعداد الواجب وإضافة الأسئلة وتحديد الدرجات'
            : 'اتبع الخطوات لإعداد الاختبار وإضافة الأسئلة وتحديد الدرجات'}
        </p>
      </div>
      
      <AssessmentWizard type={isAssignment ? 'ASSIGNMENT' : 'EXAM'} />
    </div>
  );
}
