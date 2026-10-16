"use client";

import React from "react";
import { Video, Play } from "lucide-react";

export interface CoursePromoCardProps {
  previewVideoUrl?: string | null;
  onEditCourse: () => void;
  onOpenPromoPreview: () => void;
}

export function CoursePromoCard({
  previewVideoUrl,
  onEditCourse,
  onOpenPromoPreview,
}: CoursePromoCardProps) {
  if (previewVideoUrl) {
    return (
      <div className="bg-white border border-emerald-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  الفيديو التعريفي بالكورس (البرومو) 🎬
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  مفعل وجاهز للعرض للطلاب
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                هذا الفيديو يظهر في واجهة المنصة وصفحة الكورسات لجذب الطلاب قبل الاشتراك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEditCourse}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            >
              تغيير الفيديو
            </button>
            <button
              type="button"
              onClick={onOpenPromoPreview}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تكبير الفيديو</span>
            </button>
          </div>
        </div>

        <div className="mt-4 aspect-video max-w-3xl mx-auto rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-md">
          {!previewVideoUrl.startsWith("bunny:") ? (
            <iframe
              src={`${previewVideoUrl}${previewVideoUrl.includes("?") ? "&" : "?"}autoplay=0`}
              loading="lazy"
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-center p-6">
              <Video className="w-8 h-8 text-amber-400" />
              <p className="text-xs font-bold text-white">الفيديو التعريفي قيد المعالجة ⏳</p>
              <p className="text-[11px] text-slate-400">سيظهر هنا فور اكتمال رفع Bunny Stream.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-l from-slate-50 to-amber-50/50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
          <Video className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            لم تقم بإضافة فيديو تعريفي (برومو) لهذا الكورس بعد
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            إضافة فيديو تعريفي قصير يشرح محتوى الكورس يشجع الطلاب على الاشتراك في الدورة.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEditCourse}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
      >
        رفع فيديو تعريفي 🎬
      </button>
    </div>
  );
}
