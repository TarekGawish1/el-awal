import { Metadata } from 'next';
import { StudentCourseLearningRoom } from '@/features/student-portal/components/StudentCourseLearningRoom';

export const metadata: Metadata = {
  title: 'غرفة التعلم ومشاهدة الدروس | منصة الأول',
  description: 'مشاهدة شروحات الفيديو والملخصات وحل الاختبارات التفاعلية',
};

interface StudentCourseLearnPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    lessonId?: string;
  };
}

export default function StudentCourseLearnPage({
  params,
  searchParams,
}: StudentCourseLearnPageProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <StudentCourseLearningRoom
        courseId={params.id}
        initialLessonId={searchParams?.lessonId}
      />
    </div>
  );
}
