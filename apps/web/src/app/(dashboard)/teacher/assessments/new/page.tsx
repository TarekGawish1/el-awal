import { Metadata } from 'next';
import { AssessmentWizard } from '@/features/assessments/components/AssessmentWizard';

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
