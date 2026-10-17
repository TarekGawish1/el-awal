'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { StudentCourseDetailsView } from '@/features/student-portal/components/course-details/StudentCourseDetailsView';

interface PageProps {
  params?: { id?: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function StudentCourseDetailsPage({ params }: PageProps) {
  const routeParams = useParams();
  const courseId = (params?.id || routeParams?.id) as string;

  return <StudentCourseDetailsView courseId={courseId} />;
}
