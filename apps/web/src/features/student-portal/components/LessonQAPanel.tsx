'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  User,
  CornerDownLeft,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  useLessonQuestions,
  useCreateQuestion,
  useCreateReply,
} from '@/features/courses/hooks/useCourses';
import { LessonQuestion, LessonQuestionReply } from '@/features/courses/types/courses.types';
import toast from 'react-hot-toast';

interface LessonQAPanelProps {
  lessonId: string;
  lessonTitle?: string;
  currentPlaybackSeconds?: number;
  onSeekToTimestamp?: (seconds: number) => void;
}

export function LessonQAPanel({
  lessonId,
  lessonTitle,
  currentPlaybackSeconds,
  onSeekToTimestamp,
}: LessonQAPanelProps) {
  const { data: questions = [], isLoading } = useLessonQuestions(lessonId);
  const createQuestionMutation = useCreateQuestion(lessonId);
  const createReplyMutation = useCreateReply(lessonId);

  const [questionContent, setQuestionContent] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [replyInputOpenForId, setReplyInputOpenForId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionContent.trim()) {
      toast.error('يرجى كتابة نص السؤال');
      return;
    }

    try {
      const calculatedTimestamp =
        currentPlaybackSeconds !== undefined
          ? Math.floor(currentPlaybackSeconds)
          : includeTimestamp
          ? 0
          : undefined;

      await createQuestionMutation.mutateAsync({
        content: questionContent.trim(),
        videoTimestamp: calculatedTimestamp,
      });
      setQuestionContent('');
      setIncludeTimestamp(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleSendReply = async (questionId: string) => {
    if (!replyContent.trim()) {
      toast.error('يرجى كتابة نص الرد');
      return;
    }

    try {
      await createReplyMutation.mutateAsync({
        questionId,
        data: { content: replyContent.trim() },
      });
      setReplyContent('');
      setReplyInputOpenForId(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Ask Question Box */}
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

        <form onSubmit={handleSubmitQuestion} className="space-y-3">
          <textarea
            rows={3}
            value={questionContent}
            onChange={(e) => setQuestionContent(e.target.value)}
            placeholder="اكتب سؤالك بوضوح ليستفيد الجميع..."
            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTimestamp || currentPlaybackSeconds !== undefined}
                onChange={(e) => setIncludeTimestamp(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 bg-white border-slate-300 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary-600" />
                ربط السؤال بلحظة الفيديو الحالية
              </span>
            </label>

            <button
              type="submit"
              disabled={createQuestionMutation.isPending || !questionContent.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{createQuestionMutation.isPending ? 'جاري النشر...' : 'نشر السؤال'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Discussion Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-600" />
            <span>أسئلة ونقاشات الطلاب ({questions.length})</span>
          </h4>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs space-y-1 shadow-sm">
            <p className="font-bold text-slate-700">لا توجد أسئلة منشورة على هذا الدرس بعد</p>
            <p className="text-[11px] text-slate-400">كن أول من يطرح سؤالاً ويفتح باب النقاش المثمر!</p>
          </div>
        ) : (
          questions.map((q: LessonQuestion) => {
            const isReplying = replyInputOpenForId === q.id;

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{q.studentName || 'طالب'}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {q.videoTimestamp !== undefined && q.videoTimestamp !== null && (
                    <button
                      type="button"
                      onClick={() => onSeekToTimestamp?.(q.videoTimestamp!)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-100 flex items-center gap-1 transition-colors cursor-pointer"
                      title="الانتقال للحظة الفيديو"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(q.videoTimestamp)}</span>
                    </button>
                  )}
                </div>

                {/* Question Content */}
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {q.content}
                </p>

                {/* Replies Thread */}
                {q.replies && q.replies.length > 0 && (
                  <div className="pr-4 border-r-2 border-primary-200 space-y-2.5 my-2">
                    {q.replies.map((reply: LessonQuestionReply) => {
                      const isTeacher = reply.authorRole === 'TEACHER' || reply.authorRole === 'ADMIN';

                      return (
                        <div
                          key={reply.id}
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            isTeacher
                              ? 'bg-primary-50/60 border border-primary-200 text-slate-900'
                              : 'bg-slate-50 border border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold">
                              {isTeacher && (
                                <span className="bg-primary-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                                  المعلم
                                </span>
                              )}
                              <span className={isTeacher ? 'text-primary-900 font-bold' : 'text-slate-700'}>
                                {reply.authorName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(reply.createdAt).toLocaleDateString('ar-EG', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed">{reply.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply Action Form */}
                {isReplying ? (
                  <div className="pt-2 space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="اكتب ردك أو توضيحك..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyInputOpenForId(null);
                          setReplyContent('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReply(q.id)}
                        disabled={createReplyMutation.isPending || !replyContent.trim()}
                        className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {createReplyMutation.isPending ? 'جاري الإرسال...' : 'إرسال الرد'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyInputOpenForId(q.id);
                        setReplyContent('');
                      }}
                      className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-bold"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      <span>إضافة رد</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
