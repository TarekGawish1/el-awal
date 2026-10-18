"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  useCreateLesson,
  useUpdateLesson,
  useLessonStreamAuth,
} from "../hooks/useCourses";
import { coursesApi } from "../api/courses.api";
import { updateAssessment } from "@/features/assessments/api/assessments.api";
import {
  LessonEditorModalProps,
  LessonEditorTabType,
  UseLessonEditorReturn,
} from "../types/lesson-editor.types";
import { useLessonVideoUpload } from "./useLessonVideoUpload";
import { useLessonQuizLinker } from "./useLessonQuizLinker";
import { useLessonAttachments } from "./useLessonAttachments";
import { buildLessonPayload } from "../utils/lessonPayloadBuilder";

export function useLessonEditor({
  isOpen,
  courseId,
  moduleId,
  lesson,
  initialTab,
  newAssessmentId,
  newAssessmentType,
  newAssessmentTitle,
  onClose,
}: LessonEditorModalProps): UseLessonEditorReturn {
  const router = useRouter();
  const isEditing = !!lesson;
  const autoCreatedLessonIdRef = useRef<string | null>(null);
  const [autoCreatedLessonId, setAutoCreatedLessonId] = useState<string | null>(null);
  const resolvedLessonId = lesson?.id || autoCreatedLessonId || null;
  const isEditingEffective = !!resolvedLessonId;
  const [isSavingAndRedirecting, setIsSavingAndRedirecting] = useState(false);
  const isSubmittedRef = useRef(false);

  const createMutation = useCreateLesson(courseId);
  const updateMutation = useUpdateLesson(courseId);

  const queryClient = useQueryClient();
  const { data: streamAuth } = useLessonStreamAuth(resolvedLessonId || "", { enabled: isOpen });

  const [activeTab, setActiveTab] = useState<LessonEditorTabType>(initialTab || "video");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");
  const [lessonType, setLessonType] = useState("VIDEO");
  const [isFreePreview, setIsFreePreview] = useState(false);

  // Video Upload Hook
  const videoUpload = useLessonVideoUpload({
    courseId,
    moduleId,
    lesson,
    resolvedLessonId,
    streamAuth,
    title,
    setTitle,
  });

  // Quiz Linker Hook
  const quizLinker = useLessonQuizLinker({
    isOpen,
    courseId,
    lesson,
    newAssessmentId,
    newAssessmentType,
    newAssessmentTitle,
    setActiveTab,
  });

  // Attachments Hook
  const attachmentHook = useLessonAttachments({
    courseId,
    lesson,
    isSubmittedRef,
  });

  const initialEmbedUrlRef = useRef<string>("");

  // Keep autoCreatedLessonId in sync with backgroundUploadTask
  useEffect(() => {
    if (videoUpload.backgroundUploadTask?.lessonId) {
      setAutoCreatedLessonId(videoUpload.backgroundUploadTask.lessonId);
      autoCreatedLessonIdRef.current = videoUpload.backgroundUploadTask.lessonId;
    }
  }, [videoUpload.backgroundUploadTask?.lessonId]);

  // Initialize form when opening/editing
  useEffect(() => {
    isSubmittedRef.current = false;
    setAutoCreatedLessonId(null);
    autoCreatedLessonIdRef.current = null;

    if (lesson) {
      setTitle(lesson.title || "");
      setDescription(lesson.description || "");
      setSummary(lesson.summary || "");
      setLessonType(lesson.lessonType || "VIDEO");

      videoUpload.setBunnyVideoId(lesson.bunnyVideoId || "");
      videoUpload.initialBunnyVideoIdRef.current = lesson.bunnyVideoId || "";

      const resolvedEmbedUrl =
        (lesson as any).videoEmbedUrl ||
        lesson.contentUrl ||
        (lesson.bunnyVideoId ? `bunny:${lesson.bunnyVideoId}` : "") ||
        "";
      if (resolvedEmbedUrl) {
        videoUpload.setVideoEmbedUrl(resolvedEmbedUrl);
        initialEmbedUrlRef.current = resolvedEmbedUrl;
      }
      videoUpload.setVideoDurationSeconds(lesson.videoDurationSeconds || 0);
      setIsFreePreview(lesson.isPreview || false);
    } else {
      setTitle("");
      setDescription("");
      setSummary("");
      setLessonType("VIDEO");
      videoUpload.setBunnyVideoId("");
      videoUpload.initialBunnyVideoIdRef.current = "";
      videoUpload.setVideoEmbedUrl("");
      initialEmbedUrlRef.current = "";
      videoUpload.setUploadedVideoName("");
      videoUpload.setVideoDurationSeconds(0);
      setIsFreePreview(false);
    }
  }, [lesson, isOpen]);

  const handleCancel = () => {
    if (
      !isEditing &&
      videoUpload.bunnyVideoId &&
      !videoUpload.initialBunnyVideoIdRef.current
    ) {
      coursesApi.deleteUploadedFile(`bunny:${videoUpload.bunnyVideoId}`);
    }
    onClose();
  };

  const getPayload = () =>
    buildLessonPayload({
      title,
      description,
      summary,
      lessonType,
      isFreePreview,
      videoDurationSeconds: videoUpload.videoDurationSeconds,
      bunnyVideoId: videoUpload.bunnyVideoId,
      videoEmbedUrl: videoUpload.videoEmbedUrl,
      backgroundUploadTask: videoUpload.backgroundUploadTask,
      streamAuth,
      lessonQuizId: quizLinker.lessonQuizId,
      lessonHomeworkId: quizLinker.lessonHomeworkId,
      stagedAttachments: attachmentHook.attachments.map((att: any) => ({
        title: att.title,
        fileUrl: att.fileUrl,
        fileKey: att.fileKey,
        fileType: att.fileType,
        fileSize: att.fileSize,
      })),
      isEditingEffective,
    });

  const validateAndPrepare = () => {
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الدرس");
      return null;
    }
    if (title.trim().length < 3) {
      toast.error("عنوان الدرس يجب أن يتكون من 3 أحرف على الأقل");
      return null;
    }
    const data = getPayload();
    if (videoUpload.isUploadingVideo) {
      toast.error("يرجى الانتظار حتى يكتمل رفع ومعالجة الفيديو قبل حفظ الدرس ⏳");
      return null;
    }
    if (!data.effectiveVideoId && !data.effectiveContentUrl) {
      toast.error("يجب رفع أو اختيار فيديو لهذا الدرس 🎥 (لا يمكن حفظ الدرس بدون فيديو)");
      setActiveTab("video");
      return null;
    }
    return data;
  };

  const executeSave = async (payload: any) => {
    if (isEditingEffective && resolvedLessonId) {
      await updateMutation.mutateAsync({
        lessonId: resolvedLessonId,
        data: payload,
      });
      return resolvedLessonId;
    }
    const newLesson = await createMutation.mutateAsync({
      moduleId,
      data: payload,
    });
    return newLesson?.id;
  };

  const handleSaveLesson = async () => {
    const data = validateAndPrepare();
    if (!data) return;

    try {
      isSubmittedRef.current = true;
      const savedLessonId = await executeSave(data.payload);
      if (savedLessonId) {
        await quizLinker.syncAssessmentLinksOnSave(savedLessonId);
      }
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success(isEditing ? "تم حفظ التعديلات بنجاح" : "تمت إضافة الدرس بنجاح");
      onClose();
    } catch (err: any) {
      isSubmittedRef.current = false;
      const errorMsg =
        err?.response?.data?.message ||
        (Array.isArray(err?.message) ? err.message.join(", ") : err?.message) ||
        "تعذر حفظ الدرس، يرجى المحاولة مرة أخرى";
      toast.error(errorMsg);
    }
  };

  const handleSaveAndCreateAssessment = async (assessmentType: "EXAM" | "ASSIGNMENT") => {
    const data = validateAndPrepare();
    if (!data) return;

    try {
      setIsSavingAndRedirecting(true);
      isSubmittedRef.current = true;
      const targetLessonId = await executeSave(data.payload);

      if (quizLinker.lessonQuizId && targetLessonId) {
        try {
          await updateAssessment(quizLinker.lessonQuizId, {
            allowMultipleAttempts: quizLinker.allowMultipleAttempts,
            lessonId: targetLessonId,
            courseId,
          });
        } catch {}
      }

      if (quizLinker.lessonHomeworkId && targetLessonId) {
        try {
          await updateAssessment(quizLinker.lessonHomeworkId, {
            lessonId: targetLessonId,
            courseId,
          });
        } catch {}
      }

      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(
        "تم حفظ الدرس والفيديو بنجاح! جاري فتح نموذج إنشاء " +
          (assessmentType === "ASSIGNMENT" ? "الواجب..." : "الاختبار..."),
      );

      router.push(
        `/teacher/assessments/new?type=${assessmentType}&courseId=${courseId}&moduleId=${moduleId}&lessonId=${targetLessonId}&lessonTitle=${encodeURIComponent(
          title.trim(),
        )}&scope=LESSON`,
      );
    } catch (err: any) {
      isSubmittedRef.current = false;
      setIsSavingAndRedirecting(false);
      toast.error(err?.message || "تعذر حفظ الدرس قبل الانتقال للاختبار");
    }
  };

  return {
    activeTab,
    setActiveTab,
    isEditing,
    isEditingEffective,
    resolvedLessonId,
    isSavingAndRedirecting,
    isSaving: createMutation.isPending || updateMutation.isPending,

    title,
    setTitle,
    description,
    setDescription,
    summary,
    setSummary,
    lessonType,
    setLessonType,
    videoDurationSeconds: videoUpload.videoDurationSeconds,
    setVideoDurationSeconds: videoUpload.setVideoDurationSeconds,
    isFreePreview,
    setIsFreePreview,

    bunnyVideoId: videoUpload.bunnyVideoId,
    videoEmbedUrl: videoUpload.videoEmbedUrl,
    uploadedVideoName: videoUpload.uploadedVideoName,
    isUploadingVideo: videoUpload.isUploadingVideo,
    isInspectingVideo: videoUpload.isInspectingVideo,
    videoUploadProgress: videoUpload.videoUploadProgress,
    uploadSpeedMbps: videoUpload.uploadSpeedMbps,
    uploadedBytes: videoUpload.uploadedBytes,
    totalBytes: videoUpload.totalBytes,
    etaSeconds: videoUpload.etaSeconds,
    videoMeta: videoUpload.videoMeta,
    streamAuth,
    backgroundUploadTask: videoUpload.backgroundUploadTask,
    handleDirectVideoUpload: videoUpload.handleDirectVideoUpload,
    handleCancelUpload: videoUpload.handleCancelUpload,
    handleRemoveVideo: videoUpload.handleRemoveVideo,

    attachments: attachmentHook.attachments,
    isAddingAttachment: attachmentHook.isAddingAttachment,
    setIsAddingAttachment: attachmentHook.setIsAddingAttachment,
    newAttachmentTitle: attachmentHook.newAttachmentTitle,
    setNewAttachmentTitle: attachmentHook.setNewAttachmentTitle,
    newAttachmentUrl: attachmentHook.newAttachmentUrl,
    setNewAttachmentUrl: attachmentHook.setNewAttachmentUrl,
    newAttachmentKey: attachmentHook.newAttachmentKey,
    setNewAttachmentKey: attachmentHook.setNewAttachmentKey,
    newAttachmentSize: attachmentHook.newAttachmentSize,
    setNewAttachmentSize: attachmentHook.setNewAttachmentSize,
    newAttachmentType: attachmentHook.newAttachmentType,
    setNewAttachmentType: attachmentHook.setNewAttachmentType,
    handleAddAttachment: attachmentHook.handleAddAttachment,
    handleDeleteAttachment: attachmentHook.handleDeleteAttachment,
    isAddingAttachmentLoading: attachmentHook.isSubmittingAttachment,

    lessonQuizId: quizLinker.lessonQuizId,
    setLessonQuizId: quizLinker.setLessonQuizId,
    lessonHomeworkId: quizLinker.lessonHomeworkId,
    setLessonHomeworkId: quizLinker.setLessonHomeworkId,
    allowMultipleAttempts: quizLinker.allowMultipleAttempts,
    setAllowMultipleAttempts: quizLinker.setAllowMultipleAttempts,
    allowHomeworkMultipleAttempts: quizLinker.allowHomeworkMultipleAttempts,
    setAllowHomeworkMultipleAttempts: quizLinker.setAllowHomeworkMultipleAttempts,
    isQuizOptional: quizLinker.isQuizOptional,
    setIsQuizOptional: quizLinker.setIsQuizOptional,
    isHomeworkOptional: quizLinker.isHomeworkOptional,
    setIsHomeworkOptional: quizLinker.setIsHomeworkOptional,
    isQuizPassRequired: quizLinker.isQuizPassRequired,
    setIsQuizPassRequired: quizLinker.setIsQuizPassRequired,
    isHomeworkPassRequired: quizLinker.isHomeworkPassRequired,
    setIsHomeworkPassRequired: quizLinker.setIsHomeworkPassRequired,
    examOptions: quizLinker.examOptions,
    homeworkOptions: quizLinker.homeworkOptions,
    handleSaveAndCreateAssessment,

    handleSaveLesson,
    handleCancel,
  };
}
