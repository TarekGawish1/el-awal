'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { TeacherStudentProfileView } from '@/features/students/components/profile/TeacherStudentProfileView';

interface PageProps {
  params?: { id?: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function StudentDetailPage({ params }: PageProps) {
  const routeParams = useParams();
  const studentId = (params?.id || routeParams?.id) as string;

  return <TeacherStudentProfileView studentId={studentId} />;
}
