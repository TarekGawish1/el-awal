import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  description: 'سجل دخولك إلى منصة الأول التعليمية للوصول إلى الكورسات والدروس.',
};

/**
 * Login Page — Public
 * Authentication entry point for students and parents.
 * Will be built in Phase 6.
 */
export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 text-center">
          تسجيل الدخول
        </h1>
        <p className="text-neutral-500 text-center">
          سجل دخولك للوصول إلى حسابك في منصة الأول التعليمية.
        </p>
      </div>
    </main>
  );
}
