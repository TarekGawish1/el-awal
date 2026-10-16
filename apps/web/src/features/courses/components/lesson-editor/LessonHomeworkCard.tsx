"use client";

import React from "react";
import {
  BookOpen,
  Plus,
  Edit,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { showLogicalConflictToast } from "./LessonExamCard";

export interface LessonHomeworkCardProps {
  lessonHomeworkId: string;
  setLessonHomeworkId: (id: string) => void;
  allowHomeworkMultipleAttempts: boolean;
  setAllowHomeworkMultipleAttempts: (val: boolean) => void;
  isHomeworkOptional: boolean;
  setIsHomeworkOptional: (val: boolean) => void;
  isHomeworkPassRequired: boolean;
  setIsHomeworkPassRequired: (val: boolean) => void;
  homeworkOptions: any[];
  newAssessmentId?: string;
  isSavingAndRedirecting: boolean;
  handleSaveAndCreateAssessment: (type: "EXAM" | "ASSIGNMENT") => Promise<void>;
}

export function LessonHomeworkCard({
  lessonHomeworkId,
  setLessonHomeworkId,
  allowHomeworkMultipleAttempts,
  setAllowHomeworkMultipleAttempts,
  isHomeworkOptional,
  setIsHomeworkOptional,
  isHomeworkPassRequired,
  setIsHomeworkPassRequired,
  homeworkOptions,
  newAssessmentId,
  isSavingAndRedirecting,
  handleSaveAndCreateAssessment,
}: LessonHomeworkCardProps) {
  return (
    <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-3.5 shadow-2xs">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>واجب الحصة المنزلي</span>
              {lessonHomeworkId && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  مرتبط ✓
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              واجب تدريبي وتطبيقي يلتزم الطالب بحله وتسليمه بعد الانتهاء من الدرس.
            </p>
          </div>
        </div>

        {!lessonHomeworkId ? (
          <button
            type="button"
            disabled={isSavingAndRedirecting}
            onClick={() => handleSaveAndCreateAssessment("ASSIGNMENT")}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="حفظ الدرس أولاً ثم إنشاء واجب وربطه تلقائياً به"
          >
            {isSavingAndRedirecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>إنشاء واجب جديد</span>
            <ExternalLink className="w-3 h-3 mr-0.5 text-blue-400" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={`/teacher/assessments/${lessonHomeworkId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
              title="تعديل تفاصيل وأسئلة الواجب"
            >
              <Edit className="w-3 h-3 text-blue-600" />
              <span>تعديل الأسئلة</span>
              <ExternalLink className="w-2.5 h-2.5 text-blue-400" />
            </a>
            <button
              type="button"
              onClick={() => setLessonHomeworkId("")}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
              title="إلغاء ربط هذا الواجب من الدرس"
            >
              <X className="w-3 h-3" />
              <span>إلغاء الربط</span>
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          اختر الواجب المرتبط:
        </label>
        <select
          value={lessonHomeworkId}
          onChange={(e) => setLessonHomeworkId(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-purple-500 outline-none shadow-sm cursor-pointer font-medium"
        >
          <option value="">-- بدون واجب لهذا الدرس --</option>
          {homeworkOptions.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.title} (واجب - {a.totalScore} درجة)
            </option>
          ))}
        </select>
      </div>

      {newAssessmentId && lessonHomeworkId === newAssessmentId && (
        <div className="bg-blue-100/80 border border-blue-200 text-blue-900 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="font-semibold">
            تم ربط وتحديد هذا الواجب المضاف حديثاً تلقائياً ✓
          </span>
        </div>
      )}

      {/* Attempt Policy Selector for Homework */}
      {lessonHomeworkId && (
        <div className="pt-2 border-t border-blue-100/80 space-y-2">
          <label className="block text-[11px] font-bold text-slate-800">
            سياسة إعادة تسليم الواجب:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isHomeworkPassRequired) {
                  showLogicalConflictToast(
                    "لا يمكن تفعيل تسليم لمرة واحدة فقط مع اشتراط درجة النجاح للواجب، حتى لا يتعطل تقدم الطالب نهائياً في الكورس عند الرسوب. تم الإبقاء على المحاولات المتعددة."
                  );
                  return;
                }
                setAllowHomeworkMultipleAttempts(false);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                !allowHomeworkMultipleAttempts
                  ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-2xs"
                  : "border-blue-100 bg-white/60 hover:bg-white"
              }`}
            >
              <span className="text-base leading-none">🔒</span>
              <span>
                <span className="block text-xs font-bold text-slate-800">
                  تسليم لمرة واحدة فقط
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  لا يمكن للطالب إعادة تسليم الواجب بعد إرساله
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAllowHomeworkMultipleAttempts(true)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                allowHomeworkMultipleAttempts
                  ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-2xs"
                  : "border-blue-100 bg-white/60 hover:bg-white"
              }`}
            >
              <span className="text-base leading-none">🔄</span>
              <span>
                <span className="block text-xs font-bold text-slate-800">
                  إعادة غير محدودة
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  يمكن للطالب حل وتصحيح الواجب عدة مرات
                </span>
              </span>
            </button>
          </div>

          {/* Homework Optionality Selector */}
          <div className="pt-2 border-t border-blue-100/60 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-800">
              إلزامية الواجب للتقدم:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsHomeworkOptional(false)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  !isHomeworkOptional
                    ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-2xs"
                    : "border-blue-100 bg-white/60 hover:bg-white"
                }`}
              >
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    إجباري (مطلوب)
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    يجب تسليمه واجتيازه لفتح الحصص القادمة
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHomeworkOptional(true);
                  if (isHomeworkPassRequired) {
                    setIsHomeworkPassRequired(false);
                    showLogicalConflictToast(
                      "تم إلغاء اشتراط درجة النجاح تلقائياً لأن الواجب أصبح اختيارياً ويمكن تجاوزه."
                    );
                  }
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  isHomeworkOptional
                    ? "border-emerald-500 bg-white ring-2 ring-emerald-100 shadow-2xs"
                    : "border-blue-100 bg-white/60 hover:bg-white"
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    اختياري (يمكن تجاوزه)
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    يمكن للطالب تجاوزه والانتقال للخطوة التالية مباشرة
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Homework Passing Score Requirement Selector */}
          <div className="pt-2 border-t border-blue-100/60 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-800">
              اشتراط اجتياز درجة النجاح في الواجب:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsHomeworkPassRequired(false)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  !isHomeworkPassRequired
                    ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-2xs"
                    : "border-blue-100 bg-white/60 hover:bg-white"
                }`}
              >
                <span className="text-base leading-none">📝</span>
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    تسليم عادي
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    يكفي تسليم الواجب لفتح المحتوى التالي
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHomeworkPassRequired(true);
                  setAllowHomeworkMultipleAttempts(true);
                  setIsHomeworkOptional(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  isHomeworkPassRequired
                    ? "border-emerald-500 bg-white ring-2 ring-emerald-100 shadow-2xs"
                    : "border-blue-100 bg-white/60 hover:bg-white"
                }`}
              >
                <span className="text-base leading-none">🎯</span>
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    اشتراط درجة النجاح
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    يجب النجاح للتقدم (يُفعّل المحاولات المتعددة تلقائياً)
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
