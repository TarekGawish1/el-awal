import { Metadata } from 'next';
import { CourseBuilderView } from '@/features/courses/components/CourseBuilderView';

export const metadata: Metadata = {
  title: 'بناء وتعديل الكورس | منصة الأول',
  description: 'إدارة وتعديل وحدات ودروس الكورس التعليمي',
};

interface TeacherCourseBuilderPageProps {
  params: {
    id: string;
  };
}

export default function TeacherCourseBuilderPage({ params }: TeacherCourseBuilderPageProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <CourseBuilderView courseId={params.id} />
    </div>
  );
}
