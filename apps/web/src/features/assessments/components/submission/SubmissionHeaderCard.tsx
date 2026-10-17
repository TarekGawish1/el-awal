'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Bot } from 'lucide-react';
import { SubmissionStatus, QuestionType } from '../../types/assessments.types';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

interface SubmissionHeaderCardProps {
  submission: any;
  assessment: any;
  questions: any[];
  isGraded: boolean;
  totalAwardedScore: number;
  totalMaxScore: number;
  percentage: number;
  isPassing: boolean;
  isReEvaluating: boolean;
  onReEvaluate: () => void;
  activeTab: 'all' | 'essay' | 'mcq';
  setActiveTab: (tab: 'all' | 'essay' | 'mcq') => void;
}

export function SubmissionHeaderCard({
  submission,
  assessment,
  questions,
  isGraded,
  totalAwardedScore,
  totalMaxScore,
  percentage,
  isPassing,
  isReEvaluating,
  onReEvaluate,
  activeTab,
  setActiveTab,
}: SubmissionHeaderCardProps) {
  const hasEssayQuestions = questions.some((q) => q.questionType === QuestionType.ESSAY);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden relative">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isGraded ? 'success' : 'warning'} className="text-xs px-3 py-1 font-bold">
                {isGraded ? '✓ تم اعتماد التصحيح' : '⏳ بانتظار الاعتماد'}
              </Badge>
              {submission.isAutoGraded && (
                <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50 font-bold flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  مصصح تلقائياً بالكامل
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 bg-slate-50">
                {assessment?.type === 'ASSIGNMENT' ? 'واجب منزلي' : 'اختبار دراسي'}
              </Badge>
              {submission.attemptNumber && (
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                  المحاولة رقم: {submission.attemptNumber}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>إجابة الطالب:</span>
              <span className="text-primary-700">{submission.student?.user?.fullName || 'طالب'}</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">{assessment?.title}</p>
            
            {submission.submittedAt && (
              <p className="text-xs text-slate-400">
                تاريخ التسليم: {formatArabicDate(submission.submittedAt)} - {formatArabicTime(submission.submittedAt)}
              </p>
            )}
          </div>

          {/* Live Dynamic Score Box & Re-evaluate button */}
          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 rounded-2xl p-5 w-full md:w-auto min-w-[260px] shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs font-bold text-slate-500">الدرجة المحسوبة المباشرة:</span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                  isPassing 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {isPassing ? 'ناجح' : 'راسب'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-slate-900">
                  {totalAwardedScore}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  / {totalMaxScore} درجة
                </span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">النسبة المئوية:</span>
                <span className={`font-mono font-extrabold text-sm ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {percentage}%
                </span>
              </div>
            </div>

            {assessment?.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isReEvaluating}
                onClick={onReEvaluate}
                className="text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer self-stretch md:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReEvaluating ? 'animate-spin' : ''}`} />
                <span>إعادة التصحيح التلقائي للاختبار</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Filters */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'all' 
              ? 'bg-white shadow-xs text-primary-700 border border-slate-200' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          جميع الأسئلة ({questions.length})
        </button>
        {hasEssayQuestions && (
          <button
            type="button"
            onClick={() => setActiveTab('essay')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'essay' 
                ? 'bg-white shadow-xs text-primary-700 border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            الأسئلة المقالية ({questions.filter((q) => q.questionType === QuestionType.ESSAY).length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('mcq')}
          className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'mcq' 
              ? 'bg-white shadow-xs text-primary-700 border border-slate-200' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          أسئلة الاختيار والصواب/خطأ ({questions.filter((q) => q.questionType !== QuestionType.ESSAY).length})
        </button>
      </div>
    </div>
  );
}
