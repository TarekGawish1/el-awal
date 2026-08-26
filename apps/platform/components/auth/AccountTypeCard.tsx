import Link from 'next/link';
import { ReactNode } from 'react';

interface AccountTypeCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

export function AccountTypeCard({ title, description, href, icon }: AccountTypeCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm hover:shadow-md hover:border-primary-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-center w-14 h-14 bg-primary-50 text-primary-600 rounded-full mb-4 group-hover:bg-primary-100 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-neutral-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-neutral-500 text-center mb-4 min-h-[40px]">
        {description}
      </p>
      
      {/* Indicator arrow */}
      <div className="mt-auto flex items-center text-primary-600 text-sm font-semibold opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
        <span>المتابعة</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 mr-1 rtl:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </Link>
  );
}
