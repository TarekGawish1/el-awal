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
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  useLessonQuestions,
  useCreateQuestion,
  useCreateReply,
  useUpdateQuestion,
  useDeleteQuestion,
  useUpdateReply,
  useDeleteReply,
} from '@/features/courses/hooks/useCourses';
import { useAuth } from '@/features/auth';
import { LessonQuestion, LessonQuestionReply } from '@/features/courses/types/courses.types';
import { validateContentProfanity } from '@/lib/validation/content-moderation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
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
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'SECRETARIAT';

  const { data: questions = [], isLoading } = useLessonQuestions(lessonId);
  const createQuestionMutation = useCreateQuestion(lessonId);
  const createReplyMutation = useCreateReply(lessonId);
  const updateQuestionMutation = useUpdateQuestion(lessonId);
  const deleteQuestionMutation = useDeleteQuestion(lessonId);
  const updateReplyMutation = useUpdateReply(lessonId);
  const deleteReplyMutation = useDeleteReply(lessonId);

  // New question form state
  const [questionContent, setQuestionContent] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);

  // Reply form state
  const [replyInputOpenForId, setReplyInputOpenForId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Editing state for questions
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionContent, setEditQuestionContent] = useState('');

  // Editing state for replies
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'question' | 'reply';
    id: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'question',
    id: '',
    title: '',
    message: '',
  });

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit new question
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionContent.trim();
    if (!trimmed) {
      toast.error('يرجى كتابة نص السؤال');
      return;
    }

    // Profanity / Bad words validation
    const profanityError = validateContentProfanity(trimmed);
    if (profanityError) {
      toast.error(profanityError);
      return;
    }

    try {
      const videoTimestamp =
        includeTimestamp && currentPlaybackSeconds !== undefined
          ? Math.floor(currentPlaybackSeconds)
          : undefined;

      await createQuestionMutation.mutateAsync({
        content: trimmed,
        videoTimestamp,
      });
      setQuestionContent('');
      setIncludeTimestamp(false);
    } catch {
      // Error handled by mutation
    }
  };

  // Submit new reply
  const handleSendReply = async (questionId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed) {
      toast.error('يرجى كتابة نص الرد');
      return;
    }

    // Profanity / Bad words validation
    const profanityError = validateContentProfanity(trimmed);
    if (profanityError) {
      toast.error(profanityError);
      return;
    }

    try {
      await createReplyMutation.mutateAsync({
        questionId,
        data: { content: trimmed },
      });
      setReplyContent('');
      setReplyInputOpenForId(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Start editing question
  const handleStartEditQuestion = (q: LessonQuestion) => {
    setEditingQuestionId(q.id);
    setEditQuestionContent(q.content);
    setEditingReplyId(null);
  };

  // Save question edit
  const handleSaveEditQuestion = async (questionId: string) => {
    const trimmed = editQuestionContent.trim();
    if (!trimmed) {
      toast.error('نص السؤال لا يمكن أن يكون فارغاً');
      return;
    }

    // Profanity / Bad words validation
    const profanityError = validateContentProfanity(trimmed);
    if (profanityError) {
      toast.error(profanityError);
      return;
    }

    try {
      await updateQuestionMutation.mutateAsync({
        questionId,
        data: { content: trimmed },
      });
      setEditingQuestionId(null);
      setEditQuestionContent('');
    } catch {
      // Error handled by mutation
    }
  };

  // Start editing reply
  const handleStartEditReply = (reply: LessonQuestionReply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
    setEditingQuestionId(null);
  };

  // Save reply edit
  const handleSaveEditReply = async (replyId: string) => {
    const trimmed = editReplyContent.trim();
    if (!trimmed) {
      toast.error('نص الرد لا يمكن أن يكون فارغاً');
      return;
    }

    // Profanity / Bad words validation
    const profanityError = validateContentProfanity(trimmed);
    if (profanityError) {
      toast.error(profanityError);
      return;
    }

    try {
      await updateReplyMutation.mutateAsync({
        replyId,
        data: { content: trimmed },
      });
      setEditingReplyId(null);
      setEditReplyContent('');
    } catch {
      // Error handled by mutation
    }
  };

  // Trigger delete modal for question
  const handlePromptDeleteQuestion = (q: LessonQuestion) => {
    setDeleteModalState({
      isOpen: true,
      type: 'question',
      id: q.id,
      title: 'تأكيد حذف السؤال',
      message: 'هل أنت متأكد من حذف هذا السؤال وجميع الردود والمناقشات المرتبطة به؟',
    });
  };

  // Trigger delete modal for reply
  const handlePromptDeleteReply = (reply: LessonQuestionReply) => {
    setDeleteModalState({
      isOpen: true,
      type: 'reply',
      id: reply.id,
      title: 'تأكيد حذف الرد',
      message: 'هل أنت متأكد من حذف هذا الرد نهائياً؟',
    });
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (deleteModalState.type === 'question') {
      await deleteQuestionMutation.mutateAsync(deleteModalState.id);
    } else {
      await deleteReplyMutation.mutateAsync(deleteModalState.id);
    }
  };

  // Ownership / Role checks
  const canModifyQuestion = (q: LessonQuestion) => {
    if (!user) return false;
    const isAuthor =
      q.studentUserId === user.id ||
      q.studentId === user.studentProfileId ||
      q.studentId === user.id;
    return isAuthor || isTeacherOrAdmin;
  };

  const canModifyReply = (reply: LessonQuestionReply) => {
    if (!user) return false;
    const isAuthor = reply.authorId === user.id;
    return isAuthor || isTeacherOrAdmin;
  };

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        confirmLabel="نعم، احذف نهائياً"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={deleteQuestionMutation.isPending || deleteReplyMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
      />

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
            const isEditing = editingQuestionId === q.id;
            const hasManageAccess = canModifyQuestion(q);

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 transition-all hover:border-slate-300"
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

                    {/* Question Actions (Edit & Delete) */}
                    {hasManageAccess && !isEditing && (
                      <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditQuestion(q)}
                          className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="تعديل السؤال"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePromptDeleteQuestion(q)}
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
                {isEditing ? (
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
                        onClick={() => {
                          setEditingQuestionId(null);
                          setEditQuestionContent('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditQuestion(q.id)}
                        disabled={updateQuestionMutation.isPending || !editQuestionContent.trim()}
                        className="flex items-center gap-1 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        <span>{updateQuestionMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديل'}</span>
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

                              {/* Reply Action Buttons */}
                              {hasReplyManageAccess && !isEditingThisReply && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditReply(reply)}
                                    className="p-0.5 text-slate-400 hover:text-primary-600 transition-colors"
                                    title="تعديل الرد"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePromptDeleteReply(reply)}
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
                                  onClick={() => {
                                    setEditingReplyId(null);
                                    setEditReplyContent('');
                                  }}
                                  className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-800"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditReply(reply.id)}
                                  disabled={updateReplyMutation.isPending || !editReplyContent.trim()}
                                  className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  {updateReplyMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
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
