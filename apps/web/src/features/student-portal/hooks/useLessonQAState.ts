'use client';

import { useState } from 'react';
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
import toast from 'react-hot-toast';

interface UseLessonQAStateProps {
  lessonId: string;
  currentPlaybackSeconds?: number;
}

export function useLessonQAState({ lessonId, currentPlaybackSeconds }: UseLessonQAStateProps) {
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

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionContent.trim();
    if (!trimmed) {
      toast.error('يرجى كتابة نص السؤال');
      return;
    }

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

  const handleSendReply = async (questionId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed) {
      toast.error('يرجى كتابة نص الرد');
      return;
    }

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

  const handleStartEditQuestion = (q: LessonQuestion) => {
    setEditingQuestionId(q.id);
    setEditQuestionContent(q.content);
    setEditingReplyId(null);
  };

  const handleSaveEditQuestion = async (questionId: string) => {
    const trimmed = editQuestionContent.trim();
    if (!trimmed) {
      toast.error('نص السؤال لا يمكن أن يكون فارغاً');
      return;
    }

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

  const handleStartEditReply = (reply: LessonQuestionReply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
    setEditingQuestionId(null);
  };

  const handleSaveEditReply = async (replyId: string) => {
    const trimmed = editReplyContent.trim();
    if (!trimmed) {
      toast.error('نص الرد لا يمكن أن يكون فارغاً');
      return;
    }

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

  const handlePromptDeleteQuestion = (q: LessonQuestion) => {
    setDeleteModalState({
      isOpen: true,
      type: 'question',
      id: q.id,
      title: 'تأكيد حذف السؤال',
      message: 'هل أنت متأكد من حذف هذا السؤال وجميع الردود والمناقشات المرتبطة به؟',
    });
  };

  const handlePromptDeleteReply = (reply: LessonQuestionReply) => {
    setDeleteModalState({
      isOpen: true,
      type: 'reply',
      id: reply.id,
      title: 'تأكيد حذف الرد',
      message: 'هل أنت متأكد من حذف هذا الرد نهائياً؟',
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModalState.type === 'question') {
      await deleteQuestionMutation.mutateAsync(deleteModalState.id);
    } else {
      await deleteReplyMutation.mutateAsync(deleteModalState.id);
    }
  };

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

  return {
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
    isCreatingQuestion: createQuestionMutation.isPending,
    isCreatingReply: createReplyMutation.isPending,
    isUpdatingQuestion: updateQuestionMutation.isPending,
    isUpdatingReply: updateReplyMutation.isPending,
    isDeleting: deleteQuestionMutation.isPending || deleteReplyMutation.isPending,
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
  };
}
