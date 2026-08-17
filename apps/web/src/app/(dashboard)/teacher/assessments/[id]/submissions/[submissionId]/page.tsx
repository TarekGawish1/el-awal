import { Metadata } from 'next';
import { SubmissionDetails } from '@/features/assessments/components/SubmissionDetails';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'تفاصيل إجابة الطالب | منصة الأول',
};

export default function SubmissionDetailsPage({ params }: { params: { id: string; submissionId: string } }) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Link 
          href={`/teacher/assessments/${params.id}/submissions`} 
          className="text-slate-500 hover:text-primary transition-colors flex items-center w-fit text-sm font-medium"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          العودة لقائمة الإجابات
        </Link>
      </div>
      
      <SubmissionDetails submissionId={params.submissionId} />
    </div>
  );
}
