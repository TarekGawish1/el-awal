import { Metadata } from 'next';
import { CourseManagementContainer } from '@/features/courses/components/CourseManagementContainer';

export const metadata: Metadata = {
  title: 'الكورسات أونلاين | منصة الأول',
  description: 'إدارة الكورسات والدورات التدريبية والشروحات المصورة',
};

export default function TeacherCoursesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <CourseManagementContainer />
    </div>
  );
}
