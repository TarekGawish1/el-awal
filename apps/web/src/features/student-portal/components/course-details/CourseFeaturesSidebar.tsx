'use client';

import React from 'react';
import Link from 'next/link';
import {
  Play,
  Clock,
  Award,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface CourseFeaturesSidebarProps {
  course: any;
  courseId: string;
  isEnrolled: boolean;
  isPending: boolean;
  isDropped: boolean;
  onEnroll: () => void;
  onOpenSubscriptionModal: () => void;
  isEnrolling: boolean;
}

export function CourseFeaturesSidebar({
  course,
  courseId,
  isEnrolled,
  isPending,
  isDropped,
  onEnroll,
  onOpenSubscriptionModal,
  isEnrolling,
}: CourseFeaturesSidebarProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
          مميزات الاشتراك في الكورس
        </h3>
        <ul className="space-y-3 text-xs text-slate-600">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>مشاهدة شروحات الفيديو بجودة عالية وسيرفرات فائقة السرعة بدون تقطيع.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>تحميل مذكرات الشرح وملخصات PDF لكل درس دراسي.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>اختبارات إلكترونية تفاعلية وتقييم فوري للدرجات وتصحيح الإجابات.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>لوحة مناقشة وأسئلة لكل ثانية في الفيديو مع المدرس والمساعدين.</span>
          </li>
          {course.hasCertificate && (
            <li className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span className="font-bold text-slate-800">شهادة إتمام معتمدة تصدر فور إكمال جميع دروس واختبارات الكورس.</span>
            </li>
          )}
        </ul>

        <div className="pt-4 border-t border-slate-100">
          {isEnrolled ? (
            <Link
              href={`/student/courses/${courseId}/learn`}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>دخول غرفة المشاهدة والتعلم</span>
            </Link>
          ) : isPending ? (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>طلبك قيد المراجعة ⏳</span>
            </button>
          ) : isDropped ? (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الاشتراك في الكورس</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnroll}
              disabled={isEnrolling}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            >
              اشترك الآن في الكورس
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
