import { Metadata } from 'next';
import { CourseBuilderView } from '@/features/courses/components/CourseBuilderView';

export const metadata: Metadata = {
  title: 'بناء وتعديل الكورس | منصة الأول',
  description: 'إدارة وتعديل وحدات ودروس الكورس التعليمي',
};

interface TeacherCourseBuilderPageProps {
  params: Promise<{
    id: string;
  }> | {
    id: string;
  };
}

export default async function TeacherCourseBuilderPage({ params }: TeacherCourseBuilderPageProps) {
  const resolvedParams = await params;
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <CourseBuilderView courseId={resolvedParams?.id} />
    </div>
  );
}
