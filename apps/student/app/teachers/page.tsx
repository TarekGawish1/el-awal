import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'المدرسون',
  description: 'اكتشف أفضل المدرسين في منصة الأول التعليمية. تصفح ملفات المدرسين والتخصصات والكورسات المتاحة.',
};

/**
 * Teacher Discovery Page — Public
 * Lists available teachers with filters.
 * Will be built in Phase 4.
 */
export default function TeachersPage() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">المدرسون</h1>
        <p className="text-neutral-500">
          اكتشف أفضل المدرسين وتصفح تخصصاتهم وكورساتهم.
        </p>
      </div>
    </main>
  );
}
