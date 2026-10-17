'use client';

import { usePathname } from 'next/navigation';
import StudentDetailPage from './[id]/page';
import { TeacherStudentsView } from '@/features/students/components/TeacherStudentsView';

export default function TeacherStudentsPage() {
  const pathname = usePathname();
  const pathParts = pathname?.split('/').filter(Boolean) || [];
  const directStudentId = pathParts.length >= 3 && pathParts[1] === 'students' ? pathParts[2] : null;

  if (directStudentId) {
    return <StudentDetailPage params={{ id: directStudentId }} />;
  }

  return <TeacherStudentsView />;
}
