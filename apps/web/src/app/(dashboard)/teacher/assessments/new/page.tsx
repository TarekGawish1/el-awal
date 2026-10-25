import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

const AssessmentWizard = dynamic(
  () => import('@/features/assessments/components/AssessmentWizard').then((mod) => mod.AssessmentWizard),
  {
    loading: () => (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-2 rounded-full" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-5">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
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
