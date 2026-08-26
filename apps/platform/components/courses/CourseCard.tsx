import { CourseCatalogItem } from '@/lib/types/courses';

export function CourseCard({ course }: { course: CourseCatalogItem }) {
  const {
    title,
    coverImageUrl,
    subject,
    gradeLevel,
    academicStage,
    price,
    teacher,
    _count,
  } = course;

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden transition-shadow hover:shadow-md h-full">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-neutral-100 shrink-0">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-primary-600 text-white px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm">
          {subject}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-2 leading-tight">
          {title}
        </h3>
        
        <p className="text-sm font-medium text-neutral-600 mb-4 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          مع {teacher.user.fullName}
        </p>

        {/* Academic Details */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {academicStage && (
            <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">
              {academicStage}
            </span>
          )}
          <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">
            {gradeLevel}
          </span>
          <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">
            {_count.modules} وحدة
          </span>
        </div>

        {/* Footer (Price & CTA) */}
        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-0.5">السعر</span>
            <span className="text-lg font-bold text-primary-600">
              {Number(price) === 0 ? 'مجانًا' : `${Number(price)} جنيه`}
            </span>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            عرض الكورس
          </button>
        </div>
      </div>
    </div>
  );
}
