import { Metadata } from 'next';
import { CourseCard } from '@/components/courses/CourseCard';
import { PaginatedCourseResponse } from '@/lib/types/courses';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api/endpoints';

export const metadata: Metadata = {
  title: 'الكورسات التعليمية',
  description: 'اكتشف الكورسات التعليمية المتاحة من مدرسين الأول.',
};

export const revalidate = 60;

async function getCourses(): Promise<PaginatedCourseResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.COURSES.CATALOG}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch courses catalog:', error);
    return null;
  }
}

export default async function CoursesPage() {
  const response = await getCourses();

  if (!response) {
    return (
      <main className="flex-1 w-full bg-neutral-50 pb-16">
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">تعذر تحميل الكورسات حاليًا</h2>
          <p className="text-neutral-600">حاول مرة أخرى لاحقًا.</p>
        </div>
      </main>
    );
  }

  const courses = response.data;

  return (
    <main className="flex-1 w-full bg-neutral-50 pb-16">
      {/* Header Section */}
      <section className="bg-white border-b border-neutral-200 py-12 md:py-16 mb-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            الكورسات التعليمية
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            اختار الكورس المناسب لرحلتك التعليمية
          </p>
        </div>
      </section>

      {/* Course Grid Section */}
      <section className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900">جميع الكورسات</h2>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">لا توجد كورسات متاحة حاليًا</h3>
            <p className="text-neutral-600">تابعنا لمعرفة الكورسات الجديدة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
