'use client';

import React from 'react';
import { HelpCircle, Clock, Send } from 'lucide-react';

interface AskQuestionCardProps {
  questionContent: string;
  setQuestionContent: (val: string) => void;
  includeTimestamp: boolean;
  setIncludeTimestamp: (val: boolean) => void;
  currentPlaybackSeconds?: number;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AskQuestionCard({
  questionContent,
  setQuestionContent,
  includeTimestamp,
  setIncludeTimestamp,
  currentPlaybackSeconds,
  isPending,
  onSubmit,
}: AskQuestionCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            اسأل المعلم عن أي جزئية غير واضحة في الدرس
          </h3>
          <p className="text-[11px] text-slate-500">
            سيقوم المعلم أو المشرف الأكاديمي بالرد عليك مباشرة هنا في نافذة المناقشة
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={questionContent}
          onChange={(e) => setQuestionContent(e.target.value)}
          placeholder="اكتب سؤالك بوضوح ليستفيد الجميع..."
          className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <label
            className={`flex items-center gap-2 text-xs cursor-pointer select-none ${
              currentPlaybackSeconds !== undefined
                ? 'text-primary-700 font-semibold'
                : 'text-slate-400 cursor-not-allowed'
            }`}
            title={currentPlaybackSeconds === undefined ? 'شغّل الفيديو أولاً لتفعيل ربط الوقت' : undefined}
          >
            <input
              type="checkbox"
              checked={includeTimestamp}
              disabled={currentPlaybackSeconds === undefined}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 bg-white border-slate-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary-600" />
              ربط السؤال بلحظة الفيديو الحالية
              {currentPlaybackSeconds !== undefined && (
                <span className="font-mono text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-1.5 py-0.5 rounded-md ml-1">
                  {formatTimestamp(currentPlaybackSeconds)}
                </span>
              )}
            </span>
          </label>

          <button
            type="submit"
            disabled={isPending || !questionContent.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPending ? 'جاري النشر...' : 'نشر السؤال'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
