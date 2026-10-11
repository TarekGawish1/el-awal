import { Metadata } from 'next';
import { StudentCourseLearningRoom } from '@/features/student-portal/components/StudentCourseLearningRoom';

export const metadata: Metadata = {
  title: 'معاينة قاعة المشاهدة والتعلم | منصة الأول',
  description: 'معاينة شروحات الفيديو والملخصات والاختبارات التفاعلية كمعلم',
};

interface TeacherCoursePreviewPageProps {
  params: Promise<{
    id: string;
  }> | {
    id: string;
  };
  searchParams?: Promise<{
    lessonId?: string;
  }> | {
    lessonId?: string;
  };
}

export default async function TeacherCoursePreviewPage({
  params,
  searchParams,
}: TeacherCoursePreviewPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return (
    <div className="max-w-7xl mx-auto">
      <StudentCourseLearningRoom
        courseId={resolvedParams?.id}
        initialLessonId={resolvedSearchParams?.lessonId}
      />
    </div>
  );
}
