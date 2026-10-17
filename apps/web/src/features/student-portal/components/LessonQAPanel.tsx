'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { LessonQuestion, LessonQuestionReply } from '@/features/courses/types/courses.types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useLessonQAState } from '../hooks/useLessonQAState';
import { AskQuestionCard } from './qa/AskQuestionCard';
import { LessonQuestionItem } from './qa/LessonQuestionItem';

interface LessonQAPanelProps {
  lessonId: string;
  lessonTitle?: string;
  currentPlaybackSeconds?: number;
  onSeekToTimestamp?: (seconds: number) => void;
}

export function LessonQAPanel({
  lessonId,
  currentPlaybackSeconds,
  onSeekToTimestamp,
}: LessonQAPanelProps) {
  const {
    questions,
    isLoading,
    questionContent,
    setQuestionContent,
    includeTimestamp,
    setIncludeTimestamp,
    replyInputOpenForId,
    setReplyInputOpenForId,
    replyContent,
    setReplyContent,
    editingQuestionId,
    setEditingQuestionId,
    editQuestionContent,
    setEditQuestionContent,
    editingReplyId,
    setEditingReplyId,
    editReplyContent,
    setEditReplyContent,
    deleteModalState,
    setDeleteModalState,
    isCreatingQuestion,
    isCreatingReply,
    isUpdatingQuestion,
    isUpdatingReply,
    isDeleting,
    handleSubmitQuestion,
    handleSendReply,
    handleStartEditQuestion,
    handleSaveEditQuestion,
    handleStartEditReply,
    handleSaveEditReply,
    handlePromptDeleteQuestion,
    handlePromptDeleteReply,
    handleConfirmDelete,
    canModifyQuestion,
    canModifyReply,
  } = useLessonQAState({ lessonId, currentPlaybackSeconds });

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
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Ask Question Box */}
      <AskQuestionCard
        questionContent={questionContent}
        setQuestionContent={setQuestionContent}
        includeTimestamp={includeTimestamp}
        setIncludeTimestamp={setIncludeTimestamp}
        currentPlaybackSeconds={currentPlaybackSeconds}
        isPending={isCreatingQuestion}
        onSubmit={handleSubmitQuestion}
      />

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
          questions.map((q: LessonQuestion) => (
            <LessonQuestionItem
              key={q.id}
              question={q}
              isReplying={replyInputOpenForId === q.id}
              isEditingQuestion={editingQuestionId === q.id}
              editQuestionContent={editQuestionContent}
              setEditQuestionContent={setEditQuestionContent}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              editingReplyId={editingReplyId}
              editReplyContent={editReplyContent}
              setEditReplyContent={setEditReplyContent}
              canModifyQuestion={canModifyQuestion(q)}
              canModifyReply={(reply: LessonQuestionReply) => canModifyReply(reply)}
              isUpdatingQuestion={isUpdatingQuestion}
              isCreatingReply={isCreatingReply}
              isUpdatingReply={isUpdatingReply}
              onSeekToTimestamp={onSeekToTimestamp}
              onStartEditQuestion={() => handleStartEditQuestion(q)}
              onCancelEditQuestion={() => {
                setEditingQuestionId(null);
                setEditQuestionContent('');
              }}
              onSaveEditQuestion={() => handleSaveEditQuestion(q.id)}
              onPromptDeleteQuestion={() => handlePromptDeleteQuestion(q)}
              onOpenReply={() => {
                setReplyInputOpenForId(q.id);
                setReplyContent('');
              }}
              onCancelReply={() => {
                setReplyInputOpenForId(null);
                setReplyContent('');
              }}
              onSendReply={() => handleSendReply(q.id)}
              onStartEditReply={(reply) => handleStartEditReply(reply)}
              onCancelEditReply={() => {
                setEditingReplyId(null);
                setEditReplyContent('');
              }}
              onSaveEditReply={(replyId) => handleSaveEditReply(replyId)}
              onPromptDeleteReply={(reply) => handlePromptDeleteReply(reply)}
            />
          ))
        )}
      </div>
    </div>
  );
}
