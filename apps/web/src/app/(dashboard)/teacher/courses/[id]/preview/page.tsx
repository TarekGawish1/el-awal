import { Metadata } from 'next';
import { StudentCourseLearningRoom } from '@/features/student-portal/components/StudentCourseLearningRoom';

export const metadata: Metadata = {
  title: 'معاينة قاعة المشاهدة والتعلم | منصة الأول',
  description: 'معاينة شروحات الفيديو والملخصات والاختبارات التفاعلية كمعلم',
};

interface TeacherCoursePreviewPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    lessonId?: string;
  };
}

export default function TeacherCoursePreviewPage({
  params,
  searchParams,
}: TeacherCoursePreviewPageProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <StudentCourseLearningRoom
        courseId={params.id}
        initialLessonId={searchParams?.lessonId}
      />
    </div>
  );
}
