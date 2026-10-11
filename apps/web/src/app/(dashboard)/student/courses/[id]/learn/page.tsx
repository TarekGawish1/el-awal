import { Metadata } from 'next';
import { StudentCourseLearningRoom } from '@/features/student-portal/components/StudentCourseLearningRoom';

export const metadata: Metadata = {
  title: 'غرفة التعلم ومشاهدة الدروس | منصة الأول',
  description: 'مشاهدة شروحات الفيديو والملخصات وحل الاختبارات التفاعلية',
};

interface StudentCourseLearnPageProps {
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

export default async function StudentCourseLearnPage({
  params,
  searchParams,
}: StudentCourseLearnPageProps) {
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
