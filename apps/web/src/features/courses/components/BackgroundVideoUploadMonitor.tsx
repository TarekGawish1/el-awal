'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Video,
  Zap,
  Clock,
} from 'lucide-react';
import { useVideoUploadManager } from '../context/video-upload-manager.context';
import {
  formatVideoSize,
  formatEtaArabic,
} from '../utils/video-optimizer';

export function BackgroundVideoUploadMonitor() {
  const { activeTasks, cancelUpload, dismissTask } = useVideoUploadManager();
  const [isMinimized, setIsMinimized] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  if (!activeTasks || activeTasks.length === 0) {
    return null;
  }

  // Primary task to display (the most active or last updated)
  const currentTask = activeTasks[activeTasks.length - 1];
  const isUploading =
    currentTask.status === 'uploading' ||
    currentTask.status === 'inspecting' ||
    currentTask.status === 'processing';
  const isCompleted = currentTask.status === 'completed';
  const isError = currentTask.status === 'error';

  return (
    <aside
      aria-label="مراقب رفع الفيديو في الخلفية"
      className="fixed bottom-4 left-4 z-50 w-full max-w-[calc(100vw-2rem)] sm:w-96 font-sans text-slate-800 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto select-none"
      dir="rtl"
    >
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
        {/* Top Header Bar */}
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 border-b transition-colors ${
            isCompleted
              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
              : isError
              ? 'bg-rose-50/80 border-rose-100 text-rose-900'
              : 'bg-slate-50/90 border-slate-100 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isUploading && (
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary-500 rounded-full animate-ping" />
              </div>
            )}
            {isCompleted && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            {isError && (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}

            <span className="text-xs font-bold truncate">
              {isCompleted
                ? 'اكتمل الرفع في الخلفية'
                : isError
                ? 'تنبيه في رفع الفيديو'
                : 'جاري الرفع في الخلفية'}
            </span>

            {activeTasks.length > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {activeTasks.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
              title={isMinimized ? 'تكبير' : 'تصغير'}
            >
              {isMinimized ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {(isCompleted || isError) && (
              <button
                type="button"
                onClick={() => dismissTask(currentTask.id)}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Minimized Quick Bar */}
        {isMinimized ? (
          <div className="px-3 py-2 flex items-center justify-between text-xs bg-white">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium text-slate-700 max-w-[180px]">
                {currentTask.lessonTitle}
              </span>
            </div>
            <span className="font-mono font-bold text-primary-600 text-[11px]">
              {currentTask.progress}%
            </span>
          </div>
        ) : (
          /* Expanded Full Monitor Body */
          <div className="p-3.5 space-y-3 bg-white">
            {/* Lesson Title & File Name */}
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-primary-50 text-primary-600 shrink-0 mt-0.5">
                <Video className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {currentTask.lessonTitle}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                  {currentTask.fileName}
                </p>
              </div>
              <span className="font-mono font-extrabold text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                {currentTask.progress}%
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isError
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-primary-600 to-indigo-500'
                  }`}
                  style={{ width: `${Math.max(currentTask.progress, 5)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                <span>
                  {formatVideoSize(currentTask.uploadedBytes || 0)} من{' '}
                  {formatVideoSize(currentTask.totalBytes || 0)}
                </span>
                {currentTask.speedMbps && currentTask.speedMbps > 0 ? (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {currentTask.speedMbps} ميجابايت/ث
                  </span>
                ) : null}
              </div>
            </div>

            {/* Status Information Box */}
            {isUploading && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>الوقت المتبقي التقريبي:</span>
                  <span className="font-semibold text-slate-800">
                    {formatEtaArabic(currentTask.etaSeconds || 0)}
                  </span>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-emerald-800 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  تم رفع الفيديو وتخزينه وحفظه في الدرس بنجاح!
                </span>
              </div>
            )}

            {isError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-rose-800 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">
                  {currentTask.error || 'حدث خطأ أثناء رفع الفيديو'}
                </span>
              </div>
            )}

            {/* Helpful reassurance badge for background work */}
            {isUploading && (
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                💡 يستمر الرفع بأمان في الخلفية حتى لو أغلقت نافذة الدرس أو قمت بإنشاء اختبارات.
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
              {isUploading && (
                <>
                  {confirmCancelId === currentTask.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-rose-600 font-medium">
                        تأكيد إلغاء الرفع؟
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          cancelUpload(currentTask.id);
                          setConfirmCancelId(null);
                        }}
                        className="px-2.5 py-1 text-[11px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors"
                      >
                        نعم، إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(null)}
                        className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        تراجع
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmCancelId(currentTask.id)}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors font-medium"
                    >
                      إلغاء الرفع
                    </button>
                  )}
                </>
              )}

              {(isCompleted || isError) && (
                <button
                  type="button"
                  onClick={() => dismissTask(currentTask.id)}
                  className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                >
                  إغلاق التنبيه
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
