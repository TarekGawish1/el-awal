'use client';

import React from 'react';
import { FileText, MessageSquare, Paperclip, Award } from 'lucide-react';

export interface LearningRoomTabsNavProps {
  activeTab: 'summary' | 'qa' | 'resources' | 'quiz';
  setActiveTab: (tab: 'summary' | 'qa' | 'resources' | 'quiz') => void;
  attachmentsCount: number;
  hasAssessment: boolean;
}

export function LearningRoomTabsNav({
  activeTab,
  setActiveTab,
  attachmentsCount,
  hasAssessment,
}: LearningRoomTabsNavProps) {
  return (
    <div
      id="lesson-content-tabs"
      className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto text-xs shadow-sm"
    >
      <button
        type="button"
        onClick={() => setActiveTab('summary')}
        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
          activeTab === 'summary'
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>ملخص الدرس</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('qa')}
        className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
          activeTab === 'qa'
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span>الأسئلة والنقاش (Q&A)</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('resources')}
        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
          activeTab === 'resources'
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
        }`}
      >
        <Paperclip className="w-4 h-4" />
        <span>المرفقات والتحميلات</span>
        {attachmentsCount > 0 && (
          <span className="bg-primary-50 text-primary-700 px-1.5 py-0.2 rounded-md text-[10px] font-bold">
            {attachmentsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('quiz')}
        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
          activeTab === 'quiz'
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
        }`}
      >
        <Award className="w-4 h-4" />
        <span>الاختبارات والتقييم</span>
        {hasAssessment && <span className="w-2 h-2 rounded-full bg-amber-400" />}
      </button>
    </div>
  );
}
