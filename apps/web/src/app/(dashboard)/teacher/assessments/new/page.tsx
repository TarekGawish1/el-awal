import { Metadata } from 'next';
import { AssessmentWizard } from '@/features/assessments/components/AssessmentWizard';

export const metadata: Metadata = {
  title: 'إنشاء اختبار جديد | منصة الأول',
  description: 'إنشاء اختبار جديد وإضافة الأسئلة',
};

export default function CreateAssessmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">إنشاء اختبار جديد</h1>
        <p className="text-slate-500 mt-1">اتبع الخطوات لإعداد الاختبار وإضافة الأسئلة وتحديد الدرجات</p>
      </div>
      
      <AssessmentWizard />
    </div>
  );
}
