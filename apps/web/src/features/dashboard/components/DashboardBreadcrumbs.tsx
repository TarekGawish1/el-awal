'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  teacher: 'الرئيسية',
  student: 'الرئيسية',
  dashboard: 'لوحة التحكم',
  groups: 'المجموعات الدراسية',
  attendance: 'رصد الحضور والغياب',
  students: 'سجل الطلاب',
  assessments: 'الواجبات والاختبارات',
  content: 'المحتوى والدروس',
  finance: 'الماليات والمصروفات',
  create: 'إنشاء جديد',
  edit: 'تعديل',
  view: 'عرض التفاصيل',
  payments: 'المدفوعات',
  courses: 'الدورات',
};

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  
  if (!pathname) return null;

  const segments = pathname.split('/').filter(Boolean);
  
  // Optional: Do not show breadcrumbs on root dashboard pages if you want, 
  // but it's often good to show them everywhere.
  
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    
    // Check if segment is a dynamic ID (usually numbers or uuids)
    // For simplicity, if it's a number, we call it "تفاصيل" (Details)
    // or if it's long we assume it's an ID.
    const isId = /^\d+$/.test(segment) || segment.length > 20;
    
    let label = routeLabels[segment] || segment;
    if (isId) {
      label = 'تفاصيل';
    }

    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center text-sm font-medium text-neutral-500 overflow-hidden" aria-label="Breadcrumb">
      <Link
        href={segments[0] === 'student' ? '/student/dashboard' : '/teacher/dashboard'}
        className="flex items-center hover:text-primary-600 transition-colors shrink-0"
      >
        <Home className="w-4 h-4 me-1.5" />
        <span className="hidden sm:inline-block">{routeLabels[segments[0]] || 'الرئيسية'}</span>
      </Link>
      
      {breadcrumbs.slice(1).map((breadcrumb, index) => (
        <div key={breadcrumb.href} className="flex items-center shrink-0">
          <ChevronLeft className="w-4 h-4 mx-1 sm:mx-2 text-neutral-400 shrink-0" />
          {breadcrumb.isLast ? (
            <span className="text-neutral-900 font-bold truncate max-w-[120px] sm:max-w-[200px]" aria-current="page">
              {breadcrumb.label}
            </span>
          ) : (
            <Link
              href={breadcrumb.href}
              className="hover:text-primary-600 transition-colors truncate max-w-[100px] sm:max-w-[150px]"
            >
              {breadcrumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
