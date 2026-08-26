/**
 * Dynamic Teacher Profile Page — Public
 * Displays a specific teacher's public profile with SSR/ISR for SEO.
 * Will be built in Phase 5.
 */
export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          صفحة المدرس
        </h1>
        <p className="text-neutral-500">
          ملف المدرس: {slug}
        </p>
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `المدرس ${slug}`,
    description: `ملف المدرس ${slug} في منصة الأول التعليمية`,
  };
}
