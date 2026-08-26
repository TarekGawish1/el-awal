import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الرئيسية',
};

/**
 * Landing Page — Public Entry Point
 * Will be built incrementally in Phase 3.
 */
export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center px-6 py-24">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 6 3 12 0v-5" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 mb-3">
          منصة الأول التعليمية
        </h1>
        <p className="text-lg text-neutral-500 max-w-md mx-auto">
          تعليم حضوري وأونلاين — اكتشف أفضل المدرسين والكورسات
        </p>
      </div>
    </main>
  );
}
