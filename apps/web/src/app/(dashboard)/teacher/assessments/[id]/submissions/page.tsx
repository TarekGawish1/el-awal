import { Metadata } from 'next';
import { SubmissionsList } from '@/features/assessments/components/SubmissionsList';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'إجابات الطلاب | منصة الأول',
};

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Link 
          href={`/teacher/assessments/${params.id}`} 
          className="text-slate-500 hover:text-primary transition-colors flex items-center w-fit text-sm font-medium"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          العودة لتفاصيل الاختبار
        </Link>
      </div>
      
      <SubmissionsList assessmentId={params.id} />
    </div>
  );
}
