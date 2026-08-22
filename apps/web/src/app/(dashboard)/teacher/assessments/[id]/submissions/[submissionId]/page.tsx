'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { SubmissionDetails } from '@/features/assessments/components/SubmissionDetails';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
    submissionId: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function SubmissionDetailsPage({ params }: PageProps) {
  const routeParams = useParams();
  const id = (params?.id || routeParams?.id) as string;
  const submissionId = (params?.submissionId || routeParams?.submissionId) as string;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Link 
          href={`/teacher/assessments/${id}/submissions`} 
          className="text-slate-500 hover:text-primary transition-colors flex items-center w-fit text-sm font-medium"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          العودة لقائمة الإجابات
        </Link>
      </div>
      
      <SubmissionDetails submissionId={submissionId} />
    </div>
  );
}
