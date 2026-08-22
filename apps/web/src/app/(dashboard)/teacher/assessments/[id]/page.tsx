'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AssessmentDetails } from '@/features/assessments/components/AssessmentDetails';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function AssessmentDetailsPage({ params }: PageProps) {
  const routeParams = useParams();
  const assessmentId = (params?.id || routeParams?.id) as string;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Link 
          href="/teacher/assessments" 
          className="text-slate-500 hover:text-primary transition-colors flex items-center w-fit text-sm font-medium"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          العودة لقائمة الاختبارات
        </Link>
      </div>
      
      <AssessmentDetails assessmentId={assessmentId} />
    </div>
  );
}
