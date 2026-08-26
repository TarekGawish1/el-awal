import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تسجيل طالب جديد',
  description: 'سجل حسابك كطالب في منصة الأول التعليمية. تسجيل سهل وسريع للوصول للكورسات والمجموعات الدراسية.',
};

/**
 * Student Registration Page — Public
 * Self-service student account creation.
 * Backend already supports POST /auth/student-registration/register.
 * Will be built in Phase 6.
 */
export default function RegisterPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 text-center">
          تسجيل طالب جديد
        </h1>
        <p className="text-neutral-500 text-center">
          سجل حسابك للبدء في التعلم مع أفضل المدرسين.
        </p>
      </div>
    </main>
  );
}
