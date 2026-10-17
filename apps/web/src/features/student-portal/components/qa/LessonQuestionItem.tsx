'use client';

import React from 'react';
import {
  User,
  Clock,
  Edit2,
  Trash2,
  Check,
  CornerDownLeft,
} from 'lucide-react';
import { LessonQuestion, LessonQuestionReply } from '@/features/courses/types/courses.types';
import { formatTimestamp } from './AskQuestionCard';

interface LessonQuestionItemProps {
  question: LessonQuestion;
  isReplying: boolean;
  isEditingQuestion: boolean;
  editQuestionContent: string;
  setEditQuestionContent: (val: string) => void;
  replyContent: string;
  setReplyContent: (val: string) => void;
  editingReplyId: string | null;
  editReplyContent: string;
  setEditReplyContent: (val: string) => void;
  canModifyQuestion: boolean;
  canModifyReply: (reply: LessonQuestionReply) => boolean;
  isUpdatingQuestion: boolean;
  isCreatingReply: boolean;
  isUpdatingReply: boolean;
  onSeekToTimestamp?: (seconds: number) => void;
  onStartEditQuestion: () => void;
  onCancelEditQuestion: () => void;
  onSaveEditQuestion: () => void;
  onPromptDeleteQuestion: () => void;
  onOpenReply: () => void;
  onCancelReply: () => void;
  onSendReply: () => void;
  onStartEditReply: (reply: LessonQuestionReply) => void;
  onCancelEditReply: () => void;
  onSaveEditReply: (replyId: string) => void;
  onPromptDeleteReply: (reply: LessonQuestionReply) => void;
}

export function LessonQuestionItem({
  question,
  isReplying,
  isEditingQuestion,
  editQuestionContent,
  setEditQuestionContent,
  replyContent,
  setReplyContent,
  editingReplyId,
  editReplyContent,
  setEditReplyContent,
  canModifyQuestion,
  canModifyReply,
  isUpdatingQuestion,
  isCreatingReply,
  isUpdatingReply,
  onSeekToTimestamp,
  onStartEditQuestion,
  onCancelEditQuestion,
  onSaveEditQuestion,
  onPromptDeleteQuestion,
  onOpenReply,
  onCancelReply,
  onSendReply,
  onStartEditReply,
  onCancelEditReply,
  onSaveEditReply,
  onPromptDeleteReply,
}: LessonQuestionItemProps) {
  const q = question;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 transition-all hover:border-slate-300">
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

        <div className="flex items-center gap-2">
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

          {canModifyQuestion && !isEditingQuestion && (
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
              <button
                type="button"
                onClick={onStartEditQuestion}
                className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="تعديل السؤال"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onPromptDeleteQuestion}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="حذف السؤال"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question Content / Edit View */}
      {isEditingQuestion ? (
        <div className="space-y-2 pt-1">
          <textarea
            rows={3}
            value={editQuestionContent}
            onChange={(e) => setEditQuestionContent(e.target.value)}
            className="w-full bg-white border border-primary-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm leading-relaxed"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEditQuestion}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onSaveEditQuestion}
              disabled={isUpdatingQuestion || !editQuestionContent.trim()}
              className="flex items-center gap-1 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              <span>{isUpdatingQuestion ? 'جاري الحفظ...' : 'حفظ التعديل'}</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          {q.content}
        </p>
      )}

      {/* Replies Thread */}
      {q.replies && q.replies.length > 0 && (
        <div className="pr-4 border-r-2 border-primary-200 space-y-2.5 my-2">
          {q.replies.map((reply: LessonQuestionReply) => {
            const isTeacher = reply.authorRole === 'TEACHER' || reply.authorRole === 'ADMIN';
            const isEditingThisReply = editingReplyId === reply.id;
            const hasReplyManageAccess = canModifyReply(reply);

            return (
              <div
                key={reply.id}
                className={`p-3 rounded-xl text-xs space-y-1.5 ${
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

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {new Date(reply.createdAt).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>

                    {hasReplyManageAccess && !isEditingThisReply && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onStartEditReply(reply)}
                          className="p-0.5 text-slate-400 hover:text-primary-600 transition-colors"
                          title="تعديل الرد"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPromptDeleteReply(reply)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="حذف الرد"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditingThisReply ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={editReplyContent}
                      onChange={(e) => setEditReplyContent(e.target.value)}
                      className="w-full bg-white border border-primary-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={onCancelEditReply}
                        className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-800"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveEditReply(reply.id)}
                        disabled={isUpdatingReply || !editReplyContent.trim()}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {isUpdatingReply ? 'جاري الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="leading-relaxed">{reply.content}</p>
                )}
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
              onClick={onCancelReply}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onSendReply}
              disabled={isCreatingReply || !replyContent.trim()}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {isCreatingReply ? 'جاري الإرسال...' : 'إرسال الرد'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onOpenReply}
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-bold"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>إضافة رد</span>
          </button>
        </div>
      )}
    </div>
  );
}
