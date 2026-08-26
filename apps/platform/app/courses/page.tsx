import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الكورسات',
  description: 'تصفح كورسات منصة الأول التعليمية أونلاين. دروس فيديو، ملخصات، واختبارات لجميع المراحل الدراسية.',
};

/**
 * Course Catalog Page — Public
 * Displays published courses with filters.
 * Backend already supports GET /courses/catalog as @Public().
 * Will be built in Phase 4.
 */
export default function CoursesPage() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">الكورسات</h1>
        <p className="text-neutral-500">
          تصفح الكورسات المتاحة أونلاين لجميع المراحل الدراسية.
        </p>
      </div>
    </main>
  );
}
