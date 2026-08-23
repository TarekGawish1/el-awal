'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  User,
  CornerDownLeft,
  Sparkles,
  HelpCircle,
  Play,
  Loader2,
} from 'lucide-react';
import { useLessonQuestions, useCreateQuestion, useCreateReply } from '@/features/courses/hooks/useCourses';
import { LessonQuestion, LessonQuestionReply } from '@/features/courses/types/courses.types';
import toast from 'react-hot-toast';

interface LessonQAPanelProps {
  lessonId: string;
  currentPlaybackSeconds: number;
  onSeekToTimestamp: (seconds: number) => void;
}

function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function LessonQAPanel({
  lessonId,
  currentPlaybackSeconds,
  onSeekToTimestamp,
}: LessonQAPanelProps) {
  const { data: questions = [], isLoading } = useLessonQuestions(lessonId);
  const createQuestionMutation = useCreateQuestion(lessonId);
  const createReplyMutation = useCreateReply(lessonId);

  const [questionContent, setQuestionContent] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [activeReplyQuestionId, setActiveReplyQuestionId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionContent.trim()) {
      toast.error('يرجى كتابة نص السؤال');
      return;
    }

    try {
      await createQuestionMutation.mutateAsync({
        content: questionContent.trim(),
        videoTimestamp: includeTimestamp ? Math.floor(currentPlaybackSeconds) : undefined,
      });
      setQuestionContent('');
    } catch {
      // Handled by mutation
    }
  };

  const handlePostReply = async (questionId: string) => {
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
      setActiveReplyQuestionId(null);
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Ask Question Box */}
      <form
        onSubmit={handlePostQuestion}
        className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>اسأل سؤالاً أو اطلب توضيحاً حول نقطة في الشرح</span>
          </label>

          <button
            type="button"
            onClick={() => setIncludeTimestamp(!includeTimestamp)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors ${
              includeTimestamp
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ربط بالدقيقة [{formatSecondsToMMSS(currentPlaybackSeconds)}]</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={questionContent}
          onChange={(e) => setQuestionContent(e.target.value)}
          placeholder="اكتب سؤالك بوضوح ليجيبك المعلم أو المساعد التعليمي..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createQuestionMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {createQuestionMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>نشر السؤال</span>
          </button>
        </div>
      </form>

      {/* Questions Thread List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>الأسئلة والنقاشات ({questions.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-bold">لا توجد أسئلة على هذا الدرس بعد</p>
            <p className="text-[11px] text-slate-500">كن أول من يطرح سؤالاً أثناء المشاهدة!</p>
          </div>
        ) : (
          questions.map((q: LessonQuestion) => {
            const hasTimestamp = q.videoTimestamp !== null && q.videoTimestamp !== undefined;
            const isReplying = activeReplyQuestionId === q.id;

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-md"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {q.studentName?.charAt(0) || 'ط'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{q.studentName}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(q.createdAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Clickable Timestamp Chip */}
                  {hasTimestamp && (
                    <button
                      type="button"
                      onClick={() => onSeekToTimestamp(q.videoTimestamp!)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-colors"
                      title="انقر للانتقال لهذه اللحظة في الفيديو"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{formatSecondsToMMSS(q.videoTimestamp!)}</span>
                    </button>
                  )}
                </div>

                {/* Question Content */}
                <p className="text-xs text-slate-200 leading-relaxed pr-1">{q.content}</p>

                {/* Replies List */}
                {q.replies && q.replies.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-800/80 mr-4 pr-3 border-r-2 border-r-indigo-500/30">
                    {q.replies.map((reply: LessonQuestionReply) => {
                      const isTeacher = reply.authorRole === 'TEACHER';
                      const isSecretariat = reply.authorRole === 'SECRETARIAT';

                      return (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{reply.authorName}</span>
                            {(isTeacher || isSecretariat) && (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {isTeacher ? 'المعلم' : 'المساعد التعليمي'}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">
                              {new Date(reply.createdAt).toLocaleDateString('ar-EG', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{reply.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Reply Trigger & Input */}
                <div className="pt-2 flex flex-col gap-2">
                  {!isReplying ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReplyQuestionId(q.id);
                        setReplyContent('');
                      }}
                      className="self-start text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <CornerDownLeft className="w-3 h-3" />
                      <span>كتابة رد...</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="اكتب ردك هنا..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handlePostReply(q.id)}
                        disabled={createReplyMutation.isPending}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        إرسال
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveReplyQuestionId(null)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
