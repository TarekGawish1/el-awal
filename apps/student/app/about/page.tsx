import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'عن المنصة',
  description: 'تعرف على منصة الأول التعليمية — منصة تعليمية شاملة تجمع بين التعليم الحضوري والتعليم الأونلاين.',
};

/**
 * About Page — Public
 * Platform introduction and information.
 * Will be built in Phase 3 alongside the landing page.
 */
export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          عن منصة الأول التعليمية
        </h1>
        <p className="text-neutral-500">
          منصة تعليمية شاملة تجمع بين التعليم الحضوري والتعليم الأونلاين.
        </p>
      </div>
    </main>
  );
}
