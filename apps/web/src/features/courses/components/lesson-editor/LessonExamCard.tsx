"use client";

import React from "react";
import {
  Award,
  Plus,
  Edit,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

export function showLogicalConflictToast(message: string) {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-in fade-in zoom-in-95" : "animate-out fade-out"
        } max-w-md w-full bg-rose-900 text-white shadow-2xl rounded-2xl pointer-events-auto flex items-start justify-between gap-3 p-4 border border-rose-700/80`}
        dir="rtl"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-rose-100">
              تعارض في إعدادات التقييم
            </p>
            <p className="text-xs text-rose-200 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="mr-1 text-rose-300 hover:text-white p-1 rounded-lg hover:bg-rose-800/60 transition-colors shrink-0"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ),
    { duration: 8000 }
  );
}

export interface LessonExamCardProps {
  lessonQuizId: string;
  setLessonQuizId: (id: string) => void;
  allowMultipleAttempts: boolean;
  setAllowMultipleAttempts: (val: boolean) => void;
  isQuizOptional: boolean;
  setIsQuizOptional: (val: boolean) => void;
  isQuizPassRequired: boolean;
  setIsQuizPassRequired: (val: boolean) => void;
  examOptions: any[];
  newAssessmentId?: string;
  isSavingAndRedirecting: boolean;
  handleSaveAndCreateAssessment: (type: "EXAM" | "ASSIGNMENT") => Promise<void>;
}

export function LessonExamCard({
  lessonQuizId,
  setLessonQuizId,
  allowMultipleAttempts,
  setAllowMultipleAttempts,
  isQuizOptional,
  setIsQuizOptional,
  isQuizPassRequired,
  setIsQuizPassRequired,
  examOptions,
  newAssessmentId,
  isSavingAndRedirecting,
  handleSaveAndCreateAssessment,
}: LessonExamCardProps) {
  return (
    <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-3.5 shadow-2xs">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>اختبار / امتحان الحصة</span>
              {lessonQuizId && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  مرتبط ✓
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              يظهر للطالب فور انتهائه من مشاهدة شرح الدرس لقياس الفهم والاستيعاب.
            </p>
          </div>
        </div>

        {!lessonQuizId ? (
          <button
            type="button"
            disabled={isSavingAndRedirecting}
            onClick={() => handleSaveAndCreateAssessment("EXAM")}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-white hover:bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="حفظ الدرس أولاً ثم إنشاء اختبار وربطه تلقائياً به"
          >
            {isSavingAndRedirecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>إنشاء اختبار جديد</span>
            <ExternalLink className="w-3 h-3 mr-0.5 text-purple-400" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={`/teacher/assessments/${lessonQuizId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-white hover:bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
              title="تعديل تفاصيل وأسئلة الاختبار"
            >
              <Edit className="w-3 h-3 text-purple-600" />
              <span>تعديل الأسئلة</span>
              <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
            </a>
            <button
              type="button"
              onClick={() => setLessonQuizId("")}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
              title="إلغاء ربط هذا الاختبار من الدرس"
            >
              <X className="w-3 h-3" />
              <span>إلغاء الربط</span>
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          اختر الاختبار المرتبط:
        </label>
        <select
          value={lessonQuizId}
          onChange={(e) => setLessonQuizId(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm cursor-pointer font-medium"
        >
          <option value="">-- بدون اختبار لهذا الدرس --</option>
          {examOptions.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.title} ({a.type === "EXAM" ? "امتحان شامل" : "اختبار قصير"} - {a.totalScore} درجة)
            </option>
          ))}
        </select>
      </div>

      {newAssessmentId && lessonQuizId === newAssessmentId && (
        <div className="bg-purple-100/80 border border-purple-200 text-purple-900 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
          <span className="font-semibold">
            تم ربط وتحديد هذا الاختبار المضاف حديثاً تلقائياً ✓
          </span>
        </div>
      )}

      {/* Attempt Policy Selector */}
      {lessonQuizId && (
        <div className="pt-2 border-t border-purple-100/80 space-y-2">
          <label className="block text-[11px] font-bold text-slate-800">
            سياسة إعادة الامتحان للطالب:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isQuizPassRequired) {
                  showLogicalConflictToast(
                    "لا يمكن تفعيل محاولة واحدة فقط مع اشتراط درجة النجاح للتقدم، حتى لا يتعطل تقدم الطالب نهائياً في الكورس عند الرسوب. تم الإبقاء على المحاولات المتعددة."
                  );
                  return;
                }
                setAllowMultipleAttempts(false);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                !allowMultipleAttempts
                  ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                  : "border-purple-100 bg-white/60 hover:bg-white"
              }`}
            >
              <span className="text-base leading-none">🔒</span>
              <span>
                <span className="block text-xs font-bold text-slate-800">
                  محاولة واحدة فقط
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  لا يمكن للطالب إعادة الاختبار بعد تسليمه
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAllowMultipleAttempts(true)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                allowMultipleAttempts
                  ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                  : "border-purple-100 bg-white/60 hover:bg-white"
              }`}
            >
              <span className="text-base leading-none">🔄</span>
              <span>
                <span className="block text-xs font-bold text-slate-800">
                  إعادة غير محدودة
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  يمكن للطالب التدرب وإعادة الاختبار عدة مرات
                </span>
              </span>
            </button>
          </div>

          {/* Quiz Optionality Selector */}
          <div className="pt-2 border-t border-purple-100/60 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-800">
              إلزامية الاختبار للتقدم:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsQuizOptional(false)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  !isQuizOptional
                    ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                    : "border-purple-100 bg-white/60 hover:bg-white"
                }`}
              >
                <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    إجباري (مطلوب)
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    يجب حله واجتيازه لفتح الدرس أو الوحدة التالية
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsQuizOptional(true);
                  if (isQuizPassRequired) {
                    setIsQuizPassRequired(false);
                    showLogicalConflictToast(
                      "تم إلغاء اشتراط درجة النجاح تلقائياً لأن الاختبار أصبح اختيارياً ويمكن للطالب تجاوزه."
                    );
                  }
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  isQuizOptional
                    ? "border-emerald-500 bg-white ring-2 ring-emerald-100 shadow-2xs"
                    : "border-purple-100 bg-white/60 hover:bg-white"
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

          {/* Quiz Passing Score Requirement Selector */}
          <div className="pt-2 border-t border-purple-100/60 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-800">
              اشتراط اجتياز درجة النجاح للمتابعة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsQuizPassRequired(false)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  !isQuizPassRequired
                    ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                    : "border-purple-100 bg-white/60 hover:bg-white"
                }`}
              >
                <span className="text-base leading-none">📝</span>
                <span>
                  <span className="block text-xs font-bold text-slate-800">
                    تسليم عادي
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    يكفي حل وتسليم الاختبار لفتح المحتوى القادم
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsQuizPassRequired(true);
                  setAllowMultipleAttempts(true);
                  setIsQuizOptional(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  isQuizPassRequired
                    ? "border-emerald-500 bg-white ring-2 ring-emerald-100 shadow-2xs"
                    : "border-purple-100 bg-white/60 hover:bg-white"
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
