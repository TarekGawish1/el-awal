"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Video,
  FileText,
  Paperclip,
  Award,
  BookOpen,
  UploadCloud,
  CheckCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  Loader2,
  Sparkles,
  Gauge,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { CourseLesson, LessonAttachment } from "../types/courses.types";
import {
  useCreateLesson,
  useUpdateLesson,
  useAddAttachment,
  useDeleteAttachment,
  useLessonStreamAuth,
} from "../hooks/useCourses";
import { coursesApi } from "../api/courses.api";
import { useAssessments } from "@/features/assessments/hooks/use-assessments";
import { updateAssessment } from "@/features/assessments/api/assessments.api";
import {
  validateVideoFile,
  extractVideoMetadata,
  formatVideoSize,
  formatEtaArabic,
  VideoMetadata,
  MAX_VIDEO_SIZE_BYTES,
} from "../utils/video-optimizer";
import { FileUploadZone } from "./FileUploadZone";
import { useVideoUploadManager } from "../context/video-upload-manager.context";
import toast from "react-hot-toast";

interface LessonEditorModalProps {
  isOpen: boolean;
  courseId: string;
  moduleId: string;
  lesson?: CourseLesson | null;
  initialTab?: TabType;
  newAssessmentId?: string;
  newAssessmentType?: string;
  newAssessmentTitle?: string;
  onClose: () => void;
}

type TabType = "video" | "summary" | "attachments" | "quiz";

export function LessonEditorModal({
  isOpen,
  courseId,
  moduleId,
  lesson,
  initialTab,
  newAssessmentId,
  newAssessmentType,
  newAssessmentTitle,
  onClose,
}: LessonEditorModalProps) {
  const router = useRouter();
  const isEditing = !!lesson;
  const [isSavingAndRedirecting, setIsSavingAndRedirecting] = useState(false);
  const createMutation = useCreateLesson(courseId);
  const updateMutation = useUpdateLesson(courseId);
  const addAttachmentMutation = useAddAttachment(courseId);
  const deleteAttachmentMutation = useDeleteAttachment(courseId);

  const queryClient = useQueryClient();
  const { data: streamAuth } = useLessonStreamAuth(lesson?.id || "");

  const { data: assessmentsData } = useAssessments();
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : assessmentsData?.data || [];

  const [activeTab, setActiveTab] = useState<TabType>(initialTab || "video");

  // Synchronize initialTab if passed
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
  const [bunnyVideoId, setBunnyVideoId] = useState("");
  const [videoEmbedUrl, setVideoEmbedUrl] = useState("");
  const [uploadedVideoName, setUploadedVideoName] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(1800);
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [lessonQuizId, setLessonQuizId] = useState("");
  const [lessonHomeworkId, setLessonHomeworkId] = useState("");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [isQuizOptional, setIsQuizOptional] = useState(false);
  const [isHomeworkOptional, setIsHomeworkOptional] = useState(false);
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);

  // Video Upload & Optimization State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isInspectingVideo, setIsInspectingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadSpeedMbps, setUploadSpeedMbps] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
  const uploadXhrRef = React.useRef<XMLHttpRequest | null>(null);

  // New Attachment State
  const [newAttachmentTitle, setNewAttachmentTitle] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newAttachmentKey, setNewAttachmentKey] = useState("");
  const [newAttachmentSize, setNewAttachmentSize] = useState<
    number | undefined
  >();
  const [newAttachmentType, setNewAttachmentType] =
    useState<string>("application/pdf");
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);

  const isSubmittedRef = useRef(false);
  const initialBunnyVideoIdRef = useRef<string | null>(null);
  const currentBunnyVideoIdRef = useRef<string | null>(null);
  const attachmentsRef = useRef<LessonAttachment[]>([]);
  const initialQuizIdRef = useRef<string | null>(null);
  const initialHomeworkIdRef = useRef<string | null>(null);

  const {
    startUpload: startBackgroundUpload,
    cancelUpload: cancelBackgroundUpload,
    getTaskForLesson,
    attachLessonIdToTask,
    dismissTask,
  } = useVideoUploadManager();

  const backgroundUploadTask = getTaskForLesson(lesson?.id, moduleId);

  // Merge general assessments with any specific assessments linked on the lesson object
  const allAvailableAssessments = React.useMemo(() => {
    const map = new Map<string, any>();
    assessments.forEach((a: any) => {
      if (a?.id) map.set(a.id, a);
    });
    if (lesson?.lessonQuiz?.id) {
      map.set(lesson.lessonQuiz.id, lesson.lessonQuiz);
    }
    if (Array.isArray(lesson?.assessments)) {
      lesson.assessments.forEach((a: any) => {
        if (a?.id) map.set(a.id, a);
      });
    }
    if (newAssessmentId) {
      const isHw =
        newAssessmentType === "ASSIGNMENT" ||
        newAssessmentType === "HOMEWORK";
      map.set(newAssessmentId, {
        id: newAssessmentId,
        title: newAssessmentTitle
          ? decodeURIComponent(newAssessmentTitle)
          : isHw
          ? "الواجب الجديد المضاف"
          : "الاختبار الجديد المضاف",
        type: isHw ? "ASSIGNMENT" : "EXAM",
        assessmentType: isHw ? "HOMEWORK" : "EXAM",
        lessonId: lesson?.id,
      });
    }
    return Array.from(map.values());
  }, [assessments, lesson, newAssessmentId, newAssessmentType, newAssessmentTitle]);

  const examOptions = React.useMemo(() => {
    return allAvailableAssessments.filter(
      (a: any) => a?.type === "EXAM" || a?.type === "QUIZ",
    );
  }, [allAvailableAssessments]);

  const homeworkOptions = React.useMemo(() => {
    return allAvailableAssessments.filter(
      (a: any) =>
        a?.type === "ASSIGNMENT" ||
        a?.type === "HOMEWORK" ||
        a?.assessmentType === "HOMEWORK",
    );
  }, [allAvailableAssessments]);

  // Sync background upload task to modal state
  useEffect(() => {
    if (!backgroundUploadTask) return;
    if (
      backgroundUploadTask.status === "uploading" ||
      backgroundUploadTask.status === "inspecting" ||
      backgroundUploadTask.status === "processing"
    ) {
      setIsUploadingVideo(true);
      setIsInspectingVideo(backgroundUploadTask.status === "inspecting");
      setVideoUploadProgress(backgroundUploadTask.progress);
      setUploadSpeedMbps(backgroundUploadTask.speedMbps || 0);
      setUploadedBytes(backgroundUploadTask.uploadedBytes || 0);
      setTotalBytes(backgroundUploadTask.totalBytes || 0);
      setEtaSeconds(backgroundUploadTask.etaSeconds || 0);
      if (backgroundUploadTask.fileName) {
        setUploadedVideoName(backgroundUploadTask.fileName);
      }
    } else if (backgroundUploadTask.status === "completed") {
      setIsUploadingVideo(false);
      setIsInspectingVideo(false);
      setVideoUploadProgress(100);
      if (backgroundUploadTask.videoId) {
        setBunnyVideoId((prev) => prev || backgroundUploadTask.videoId || "");
      }
      if (backgroundUploadTask.embedUrl) {
        setVideoEmbedUrl((prev) => prev || backgroundUploadTask.embedUrl || "");
      }
      if (backgroundUploadTask.durationSeconds) {
        setVideoDurationSeconds((prev) => (prev === 1800 ? backgroundUploadTask.durationSeconds! : prev));
      }
      if (backgroundUploadTask.fileName) {
        setUploadedVideoName((prev) => prev || backgroundUploadTask.fileName || "");
      }
    } else if (
      backgroundUploadTask.status === "error" ||
      backgroundUploadTask.status === "aborted"
    ) {
      setIsUploadingVideo(false);
      setIsInspectingVideo(false);
    }
  }, [backgroundUploadTask]);

  // Auto-select and auto-link newly created assessment passed via props
  useEffect(() => {
    if (!newAssessmentId) return;
    const isHw =
      newAssessmentType === "ASSIGNMENT" ||
      newAssessmentType === "HOMEWORK";

    if (isHw) {
      setLessonHomeworkId(newAssessmentId);
      if (!initialHomeworkIdRef.current) {
        initialHomeworkIdRef.current = newAssessmentId;
      }
      if (lesson?.id) {
        updateAssessment(newAssessmentId, {
          lessonId: lesson.id,
          courseId,
        }).catch(() => {});
      }
    } else {
      setLessonQuizId(newAssessmentId);
      if (!initialQuizIdRef.current) {
        initialQuizIdRef.current = newAssessmentId;
      }
      if (lesson?.id) {
        updateAssessment(newAssessmentId, {
          lessonId: lesson.id,
          courseId,
        }).catch(() => {});
      }
    }
    setActiveTab("quiz");
  }, [newAssessmentId, newAssessmentType, lesson?.id, courseId]);

  useEffect(() => {
    isSubmittedRef.current = false;
    initialBunnyVideoIdRef.current = lesson?.bunnyVideoId || null;
    if (lesson) {
      setTitle(lesson.title || "");
      setDescription(lesson.description || "");
      setSummary(lesson.summary || "");
      setLessonType(lesson.lessonType || "VIDEO");

      // DO NOT wipe bunnyVideoId or videoEmbedUrl if background task, streamAuth, or state already has it!
      const resolvedVideoId =
        lesson.bunnyVideoId ||
        backgroundUploadTask?.videoId ||
        streamAuth?.videoId ||
        bunnyVideoId ||
        "";
      if (resolvedVideoId) {
        setBunnyVideoId(resolvedVideoId);
      }

      const resolvedEmbedUrl =
        videoEmbedUrl ||
        backgroundUploadTask?.embedUrl ||
        streamAuth?.embedUrl ||
        "";
      if (resolvedEmbedUrl) {
        setVideoEmbedUrl(resolvedEmbedUrl);
      }

      if (backgroundUploadTask?.fileName && !uploadedVideoName) {
        setUploadedVideoName(backgroundUploadTask.fileName);
      }

      const resolvedDuration =
        lesson.videoDurationSeconds ||
        backgroundUploadTask?.durationSeconds ||
        1800;
      setVideoDurationSeconds(resolvedDuration);

      setIsFreePreview(lesson.isPreview || false);
      setAttachments(lesson.attachments || []);

      // Resolve linked exam
      const linkedExam =
        (lesson.lessonQuiz && (lesson.lessonQuiz.type === "EXAM" || lesson.lessonQuiz.type === "QUIZ"))
          ? lesson.lessonQuiz
          : lesson.assessments?.find((a: any) => a.type === "EXAM" || a.type === "QUIZ") ||
            (lesson.lessonQuizId ? allAvailableAssessments.find((a: any) => a.id === lesson.lessonQuizId && (a.type === "EXAM" || a.type === "QUIZ")) : null);

      // Resolve linked homework
      const linkedHomework =
        lesson.assessments?.find((a: any) => a.type === "ASSIGNMENT" || a.type === "HOMEWORK" || a.assessmentType === "HOMEWORK") ||
        (lesson.lessonQuiz && (lesson.lessonQuiz.type === "ASSIGNMENT" || lesson.lessonQuiz.type === "HOMEWORK") ? lesson.lessonQuiz : null) ||
        (lesson.lessonQuizId ? allAvailableAssessments.find((a: any) => a.id === lesson.lessonQuizId && (a.type === "ASSIGNMENT" || a.type === "HOMEWORK")) : null) ||
        allAvailableAssessments.find((a: any) => a.lessonId === lesson.id && (a.type === "ASSIGNMENT" || a.type === "HOMEWORK" || a.assessmentType === "HOMEWORK"));

      const finalQuizId = linkedExam?.id || (lesson.lessonQuizId && (!linkedHomework || lesson.lessonQuizId !== linkedHomework.id) ? lesson.lessonQuizId : "");
      const finalHomeworkId = linkedHomework?.id || "";

      setLessonQuizId(finalQuizId);
      setLessonHomeworkId(finalHomeworkId);
      initialQuizIdRef.current = finalQuizId || null;
      initialHomeworkIdRef.current = finalHomeworkId || null;
    } else {
      setTitle("");
      setDescription("");
      setSummary("");
      setLessonType("VIDEO");
      setBunnyVideoId("");
      setVideoEmbedUrl("");
      setUploadedVideoName("");
      setVideoDurationSeconds(1800);
      setIsFreePreview(false);
      setLessonQuizId("");
      setLessonHomeworkId("");
      initialQuizIdRef.current = null;
      initialHomeworkIdRef.current = null;
      setAttachments([]);
    }
  }, [lesson, isOpen]);

  // If newly created assessments finish loading, associate them if not already assigned
  useEffect(() => {
    if (!lesson?.id) return;
    if (!lessonHomeworkId) {
      const matchHw = allAvailableAssessments.find(
        (a: any) => a.lessonId === lesson.id && (a.type === "ASSIGNMENT" || a.type === "HOMEWORK" || a.assessmentType === "HOMEWORK"),
      );
      if (matchHw) {
        setLessonHomeworkId(matchHw.id);
        if (!initialHomeworkIdRef.current) initialHomeworkIdRef.current = matchHw.id;
      }
    }
    if (!lessonQuizId) {
      const matchExam = allAvailableAssessments.find(
        (a: any) => a.lessonId === lesson.id && (a.type === "EXAM" || a.type === "QUIZ"),
      );
      if (matchExam) {
        setLessonQuizId(matchExam.id);
        if (!initialQuizIdRef.current) initialQuizIdRef.current = matchExam.id;
      }
    }
  }, [lesson?.id, allAvailableAssessments, lessonHomeworkId, lessonQuizId]);

  useEffect(() => {
    currentBunnyVideoIdRef.current = bunnyVideoId || null;
    attachmentsRef.current = attachments;
  }, [bunnyVideoId, attachments]);

  // Clean up staged attachments if modal unmounts without submitting
  // (Videos are managed safely by the background upload manager and should not be deleted here)
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        for (const att of attachmentsRef.current) {
          if (att.id?.startsWith("staged-") && (att.fileKey || att.fileUrl)) {
            coursesApi.deleteUploadedFile(att.fileKey || att.fileUrl);
          }
        }
      }
    };
  }, []);

  const handleCancel = () => {
    // Note: Closing the modal does NOT abort active background uploads!
    // The background upload manager continues safely in the background.
    onClose();
  };

  // Sync streamAuth embed URL and videoId when available
  useEffect(() => {
    if (streamAuth?.videoId) {
      setBunnyVideoId((prev) => prev || streamAuth.videoId);
    }
    if (streamAuth?.embedUrl) {
      setVideoEmbedUrl((prev) => prev || streamAuth.embedUrl);
    }
  }, [streamAuth]);

  // Reflect the selected quiz's current attempt policy and optionality in the toggle (or reset when none).
  useEffect(() => {
    if (!lessonQuizId) {
      setAllowMultipleAttempts(false);
      setIsQuizOptional(false);
      return;
    }
    const selected = allAvailableAssessments.find((a: any) => a.id === lessonQuizId);
    if (selected) {
      setAllowMultipleAttempts(Boolean(selected.allowMultipleAttempts ?? false));
      setIsQuizOptional(Boolean(selected.isOptional ?? false));
    }
  }, [lessonQuizId, allAvailableAssessments]);

  // Reflect the selected homework's optionality
  useEffect(() => {
    if (!lessonHomeworkId) {
      setIsHomeworkOptional(false);
      return;
    }
    const selected = allAvailableAssessments.find((a: any) => a.id === lessonHomeworkId);
    if (selected) {
      setIsHomeworkOptional(Boolean(selected.isOptional ?? false));
    }
  }, [lessonHomeworkId, allAvailableAssessments]);

  if (!isOpen) return null;

  const handleCancelUpload = () => {
    if (backgroundUploadTask) {
      cancelBackgroundUpload(backgroundUploadTask.id);
    }
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }
    setIsUploadingVideo(false);
    setIsInspectingVideo(false);
    setVideoUploadProgress(0);
    setUploadSpeedMbps(0);
    setUploadedBytes(0);
    setTotalBytes(0);
    setEtaSeconds(0);
    toast.error("تم إلغاء رفع الفيديو");
  };

  const handleDirectVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 2 GB size limit validation
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || "حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)");
      e.target.value = "";
      return;
    }

    try {
      setIsInspectingVideo(true);
      setIsUploadingVideo(true);
      setVideoUploadProgress(5);
      setUploadedVideoName(file.name);
      setTotalBytes(file.size);
      setUploadedBytes(0);

      // Extract local metadata (Duration, Resolution, Bitrate) with timeout guard
      let metaDuration = 0;
      try {
        const meta = await extractVideoMetadata(file);
        setVideoMeta(meta);
        if (meta.durationSeconds > 0) {
          metaDuration = meta.durationSeconds;
          setVideoDurationSeconds(meta.durationSeconds);
        }
      } catch (metaErr) {
        console.warn("Video metadata inspection skipped:", metaErr);
      } finally {
        setIsInspectingVideo(false);
      }

      // If lesson does not exist yet, create it immediately so the upload has a permanent lessonId
      let targetLessonId = lesson?.id;
      if (!targetLessonId) {
        const created = await createMutation.mutateAsync({
          moduleId,
          data: {
            title: title.trim() || file.name.replace(/\.[^/.]+$/, ""),
            description: description.trim() || undefined,
            summary: summary.trim() || undefined,
            lessonType,
            videoDurationSeconds: metaDuration || 0,
            isFreePreview,
            isPreview: isFreePreview,
          },
        });
        targetLessonId = created.id;
        isSubmittedRef.current = true;
      }

      await startBackgroundUpload({
        file,
        lessonId: targetLessonId,
        courseId,
        moduleId,
        lessonTitle: title.trim() || file.name,
        onSuccess: (result) => {
          setBunnyVideoId(result.videoId);
          setVideoEmbedUrl(result.embedUrl);
          if (result.durationSeconds > 0) {
            setVideoDurationSeconds(result.durationSeconds);
          }
        },
      });

      toast.success("بدأ رفع الفيديو في الخلفية! يمكنك متابعة العمل أو إغلاق النافذة بأمان.");
    } catch (err: any) {
      setIsInspectingVideo(false);
      setIsUploadingVideo(false);
      toast.error(err?.message || "تعذر بدء رفع الفيديو");
    } finally {
      e.target.value = "";
    }
  };

  const handleRemoveVideo = async () => {
    const videoToDelete = bunnyVideoId || backgroundUploadTask?.videoId;
    if (videoToDelete) {
      coursesApi.deleteUploadedFile(`bunny:${videoToDelete}`);
    }
    if (backgroundUploadTask) {
      dismissTask(backgroundUploadTask.id);
    }
    setBunnyVideoId("");
    setVideoEmbedUrl("");
    setUploadedVideoName("");
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الدرس");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("عنوان الدرس يجب أن يتكون من 3 أحرف على الأقل");
      return;
    }

    const stagedAttachments = attachments
      .filter((a) => a.id.startsWith("staged-"))
      .map((a) => ({
        title: a.title,
        fileUrl: a.fileUrl,
        fileKey: a.fileKey,
        fileSize: a.fileSize || undefined,
        fileType: a.fileType || "application/pdf",
      }));

    const effectiveVideoId =
      (bunnyVideoId && !bunnyVideoId.startsWith("r2:") ? bunnyVideoId : undefined) ||
      backgroundUploadTask?.videoId ||
      streamAuth?.videoId;

    const effectiveContentUrl =
      videoEmbedUrl ||
      (bunnyVideoId && bunnyVideoId.startsWith("r2:") ? videoEmbedUrl : undefined) ||
      backgroundUploadTask?.embedUrl ||
      streamAuth?.embedUrl;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      summary: summary.trim() || undefined,
      lessonType,
      bunnyVideoId: effectiveVideoId,
      contentUrl: effectiveContentUrl,
      videoDurationSeconds: Number(videoDurationSeconds) || backgroundUploadTask?.durationSeconds || 0,
      isFreePreview,
      isPreview: isFreePreview,
      lessonQuizId: lessonQuizId || undefined,
      attachments: stagedAttachments.length > 0 ? stagedAttachments : undefined,
    };

    try {
      isSubmittedRef.current = true;
      let savedLessonId: string | undefined = lesson?.id;
      if (isEditing && lesson) {
        await updateMutation.mutateAsync({
          lessonId: lesson.id,
          data: payload,
        });
      } else {
        const newLesson = await createMutation.mutateAsync({
          moduleId,
          data: payload,
        });
        savedLessonId = newLesson?.id;

        // If any staged attachments exist and were not created atomically
        if (
          newLesson?.id &&
          stagedAttachments.length > 0 &&
          (!newLesson.attachments || newLesson.attachments.length === 0)
        ) {
          for (const att of stagedAttachments) {
            await addAttachmentMutation.mutateAsync({
              lessonId: newLesson.id,
              data: att,
            });
          }
        }
      }

      // 1. Sync quiz policy and link
      if (lessonQuizId && savedLessonId) {
        try {
          await updateAssessment(lessonQuizId, {
            allowMultipleAttempts,
            isOptional: isQuizOptional,
            lessonId: savedLessonId,
            courseId,
          });
        } catch {
          // Best-effort: a policy update failure must not block saving the lesson.
        }
      }

      // 2. Link or unlink homework
      if (savedLessonId) {
        if (lessonHomeworkId) {
          try {
            await updateAssessment(lessonHomeworkId, {
              isOptional: isHomeworkOptional,
              lessonId: savedLessonId,
              courseId,
            });
          } catch {}
        }
        if (initialHomeworkIdRef.current && initialHomeworkIdRef.current !== lessonHomeworkId) {
          try {
            await updateAssessment(initialHomeworkIdRef.current, {
              lessonId: null,
            });
          } catch {}
        }
      }

      queryClient.invalidateQueries({ queryKey: ["courses"] });
      onClose();
    } catch {
      isSubmittedRef.current = false;
      // If saving failed on the frontend, clean up any newly uploaded video
      if (bunnyVideoId && bunnyVideoId !== initialBunnyVideoIdRef.current) {
        coursesApi.deleteUploadedFile(`bunny:${bunnyVideoId}`);
        setBunnyVideoId(initialBunnyVideoIdRef.current || "");
        setVideoEmbedUrl("");
      }
    }
  };

  const handleSaveAndCreateAssessment = async (assessmentType: "EXAM" | "ASSIGNMENT") => {
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الدرس أولاً لحفظه وربط الاختبار به");
      setActiveTab("video");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("عنوان الدرس يجب أن يتكون من 3 أحرف على الأقل");
      setActiveTab("video");
      return;
    }

    const stagedAttachments = attachments
      .filter((a) => a.id.startsWith("staged-"))
      .map((a) => ({
        title: a.title,
        fileUrl: a.fileUrl,
        fileKey: a.fileKey,
        fileSize: a.fileSize || undefined,
        fileType: a.fileType || "application/pdf",
      }));

    const effectiveVideoId =
      (bunnyVideoId && !bunnyVideoId.startsWith("r2:") ? bunnyVideoId : undefined) ||
      backgroundUploadTask?.videoId ||
      streamAuth?.videoId;

    const effectiveContentUrl =
      videoEmbedUrl ||
      (bunnyVideoId && bunnyVideoId.startsWith("r2:") ? videoEmbedUrl : undefined) ||
      backgroundUploadTask?.embedUrl ||
      streamAuth?.embedUrl;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      summary: summary.trim() || undefined,
      lessonType,
      bunnyVideoId: effectiveVideoId,
      contentUrl: effectiveContentUrl,
      videoDurationSeconds: Number(videoDurationSeconds) || backgroundUploadTask?.durationSeconds || 0,
      isFreePreview,
      isPreview: isFreePreview,
      lessonQuizId: lessonQuizId || undefined,
      attachments: stagedAttachments.length > 0 ? stagedAttachments : undefined,
    };

    try {
      setIsSavingAndRedirecting(true);
      // Mark as submitted so unmount cleanup hook never deletes the uploaded video/files
      isSubmittedRef.current = true;

      let targetLessonId = lesson?.id;

      if (isEditing && lesson) {
        await updateMutation.mutateAsync({
          lessonId: lesson.id,
          data: payload,
        });
        targetLessonId = lesson.id;
      } else {
        const newLesson = await createMutation.mutateAsync({
          moduleId,
          data: payload,
        });
        targetLessonId = newLesson?.id;

        if (
          newLesson?.id &&
          stagedAttachments.length > 0 &&
          (!newLesson.attachments || newLesson.attachments.length === 0)
        ) {
          for (const att of stagedAttachments) {
            await addAttachmentMutation.mutateAsync({
              lessonId: newLesson.id,
              data: att,
            });
          }
        }
      }

      if (lessonQuizId && targetLessonId) {
        try {
          await updateAssessment(lessonQuizId, {
            allowMultipleAttempts,
            lessonId: targetLessonId,
            courseId,
          });
        } catch {
          // ignore
        }
      }

      if (lessonHomeworkId && targetLessonId) {
        try {
          await updateAssessment(lessonHomeworkId, {
            lessonId: targetLessonId,
            courseId,
          });
        } catch {
          // ignore
        }
      }

      queryClient.invalidateQueries({ queryKey: ["courses"] });

      toast.success(
        "تم حفظ الدرس والفيديو بنجاح! جاري فتح نموذج إنشاء " +
          (assessmentType === "ASSIGNMENT" ? "الواجب..." : "الاختبار..."),
      );

      router.push(
        `/teacher/assessments/new?type=${assessmentType}&courseId=${courseId}&moduleId=${moduleId}&lessonId=${targetLessonId}&lessonTitle=${encodeURIComponent(title.trim())}&scope=LESSON`,
      );
    } catch (err: any) {
      isSubmittedRef.current = false;
      setIsSavingAndRedirecting(false);
      toast.error(err?.message || "تعذر حفظ الدرس قبل الانتقال للاختبار");
    }
  };

  const handleAddAttachment = async () => {
    if (!newAttachmentTitle.trim() || !newAttachmentUrl.trim()) {
      toast.error("يرجى كتابة عنوان ورفع الملف");
      return;
    }

    if (lesson?.id) {
      try {
        const created = await addAttachmentMutation.mutateAsync({
          lessonId: lesson.id,
          data: {
            title: newAttachmentTitle.trim(),
            fileUrl: newAttachmentUrl.trim(),
            fileKey:
              newAttachmentKey ||
              `courses/attachments/${Date.now()}-${newAttachmentTitle.trim()}`,
            fileSize: newAttachmentSize,
            fileType: newAttachmentType || "application/pdf",
          },
        });
        if (created) {
          setAttachments((prev) => [
            ...prev.filter((a) => a.id !== created.id),
            created,
          ]);
        }
        setNewAttachmentTitle("");
        setNewAttachmentUrl("");
        setNewAttachmentKey("");
        setNewAttachmentSize(undefined);
        setIsAddingAttachment(false);
      } catch {
        // Handled by mutation
      }
    } else {
      // Staging for new lesson before creation
      const stagedAtt: LessonAttachment = {
        id: `staged-${Date.now()}`,
        title: newAttachmentTitle.trim(),
        fileUrl: newAttachmentUrl.trim(),
        fileKey:
          newAttachmentKey ||
          `courses/attachments/${Date.now()}-${newAttachmentTitle.trim()}`,
        fileSize: newAttachmentSize,
        fileType: newAttachmentType || "application/pdf",
        lessonId: "",
        createdAt: new Date().toISOString(),
      };
      setAttachments((prev) => [...prev, stagedAtt]);
      setNewAttachmentTitle("");
      setNewAttachmentUrl("");
      setNewAttachmentKey("");
      setNewAttachmentSize(undefined);
      setIsAddingAttachment(false);
      toast.success("تمت إضافة المرفق مؤقتاً وسيتم حفظه مع إنشاء الدرس");
    }
  };

  const handleDeleteAttachment = async (att: LessonAttachment) => {
    if (att.id.startsWith("staged-")) {
      if (att.fileKey || att.fileUrl) {
        coursesApi.deleteUploadedFile(att.fileKey || att.fileUrl);
      }
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      toast.success("تم حذف المرفق");
      return;
    }

    try {
      await deleteAttachmentMutation.mutateAsync(att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Video className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">
                {isEditing
                  ? "تعديل محتوى وتفاصيل الدرس"
                  : "إضافة درس تعليمي جديد"}
              </h2>
              <p className="text-xs text-slate-500">
                إعداد الشرح، الفيديو، الملخصات والاختبارات التفاعلية
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Pill Tab Navigation */}
        <div className="px-6 pt-4 pb-2 bg-white">
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("video")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === "video"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>الفيديو والشرح</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === "summary"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>الملخص والملاحظات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attachments")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === "attachments"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>المرفقات والملخصات</span>
              {attachments.length > 0 && (
                <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {attachments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("quiz")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === "quiz"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>الاختبار والواجب</span>
              {(lessonQuizId || lessonHomeworkId) && (
                <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {(lessonQuizId ? 1 : 0) + (lessonHomeworkId ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="p-6 overflow-y-auto space-y-4 text-right flex-1 bg-white">
          {/* TAB 1: VIDEO & METADATA (NO MANUAL ID INPUT) */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عنوان الدرس <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الدرس الأول: شرح كان وأخواتها بالتفصيل"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  أهداف ونبذة عن الدرس
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="النقاط الرئيسية التي سيتم شرحها خلال هذا الدرس..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                />
              </div>

              {/* Direct Drag & Drop Video Upload Area */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-primary-600" />
                    فيديو الشرح التفاعلي المشفر (حتى 2 جيجابايت)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      <span>ضغط سحابي ذكي متعدد الجودات</span>
                    </span>
                    {Boolean(bunnyVideoId || streamAuth?.videoId || backgroundUploadTask?.videoId) && (
                      <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>تم ربط وتجهيز الفيديو بنجاح</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Processing notice if video is currently encoding on Bunny CDN */}
                {streamAuth?.videoStatus === "PROCESSING" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span>
                      جاري تشفير وتقطيع الفيديو سحابياً بجودات متعددة... قد
                      يستغرق دقيقة ليكتمل تجهيز المشغل بالكامل.
                    </span>
                  </div>
                )}

                {/* Uploaded Video Preview Player Card */}
                {Boolean(bunnyVideoId || videoEmbedUrl || streamAuth?.videoId || backgroundUploadTask?.videoId) ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
                    <div
                      className="relative w-full aspect-video bg-black rounded-t-2xl overflow-hidden flex items-center justify-center"
                      style={{ aspectRatio: "16 / 9", width: "100%" }}
                    >
                      {(videoEmbedUrl || streamAuth?.embedUrl || backgroundUploadTask?.embedUrl)?.includes('.b-cdn.net') ||
                      (videoEmbedUrl || streamAuth?.embedUrl || backgroundUploadTask?.embedUrl)?.includes('iframe.mediadelivery.net') ||
                      streamAuth?.embedUrl ? (
                        <iframe
                          src={videoEmbedUrl || streamAuth?.embedUrl || backgroundUploadTask?.embedUrl}
                          loading="lazy"
                          className="w-full h-full border-0 absolute inset-0 block"
                          style={{ width: "100%", height: "100%", border: 0 }}
                          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                          allowFullScreen
                        />
                      ) : (videoEmbedUrl || streamAuth?.embedUrl || backgroundUploadTask?.embedUrl) ? (
                        <iframe
                          src={videoEmbedUrl || streamAuth?.embedUrl || backgroundUploadTask?.embedUrl}
                          loading="lazy"
                          className="w-full h-full border-0 absolute inset-0 block"
                          style={{ width: "100%", height: "100%", border: 0 }}
                          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-center p-6 text-slate-400 space-y-2">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-400" />
                          <p className="text-xs">
                            جاري تجهيز مشغل الفيديو السحابي...
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 bg-slate-800/90 flex items-center justify-between gap-3 text-right">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">
                            {uploadedVideoName || backgroundUploadTask?.fileName || "فيديو الشرح المباشر"}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                            <span>ID: {bunnyVideoId || streamAuth?.videoId || backgroundUploadTask?.videoId}</span>
                            {videoMeta && (
                              <span className="text-emerald-400">
                                • {videoMeta.qualityLabel} ({videoMeta.formattedSize})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>تغيير الفيديو</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleDirectVideoUpload}
                            disabled={isUploadingVideo}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                          title="حذف الفيديو"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Direct Upload Dropzone */
                  <div className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleDirectVideoUpload}
                      disabled={isUploadingVideo}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-600">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100 shadow-sm">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        انقر لاختيار فيديو أو سحبه هنا للرفع المباشر إلى السيرفر السحابي
                      </p>
                      <div className="flex items-center flex-wrap justify-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          الحد الأقصى: 2 جيجابايت (2048 MB)
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">
                          ضغط سحابي تلقائي (HLS 1080p, 720p, 480p, 360p)
                        </span>
                        <span>•</span>
                        <span>تشفير DRM ضد التسجيل والسرقة</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Progress & Speed Metrics */}
                {isUploadingVideo && (
                  <div className="p-4 bg-white border border-blue-100 rounded-xl shadow-sm space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                        {isInspectingVideo
                          ? "جاري فحص وتجهيز الفيديو والضغط السحابي..."
                          : "جاري الرفع المباشر إلى سيرفرات البث السحابي..."}
                      </span>
                      <span className="font-mono text-primary-600 text-sm">
                        {videoUploadProgress}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        {totalBytes > 0 && (
                          <span>
                            تم رفع: <strong className="text-slate-800 font-mono">{formatVideoSize(uploadedBytes)}</strong> من <strong className="text-slate-800 font-mono">{formatVideoSize(totalBytes)}</strong>
                          </span>
                        )}
                        {uploadSpeedMbps > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Gauge className="w-3.5 h-3.5" />
                            <span className="font-mono">{uploadSpeedMbps} ميجابايت/ث</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {etaSeconds > 0 && (
                          <span className="text-slate-600">
                            الوقت المتبقي: <strong className="text-slate-800">{formatEtaArabic(etaSeconds)}</strong>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleCancelUpload}
                          className="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-bold"
                        >
                          إلغاء الرفع
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50/80 border border-blue-100/90 rounded-xl p-2.5 text-center text-xs text-blue-800 flex items-center justify-center gap-2">
                      <span className="text-base leading-none">💡</span>
                      <span className="font-medium">
                        يستمر رفع الفيديو في الخلفية بأمان — يمكنك إغلاق نافذة الدرس أو متابعة العمل وإضافة الاختبارات دون انقطاع.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Duration & Free Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    مدة الفيديو (بالثواني)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={videoDurationSeconds}
                      onChange={(e) =>
                        setVideoDurationSeconds(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm font-mono"
                    />
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {Math.floor(videoDurationSeconds / 60)} دقيقة و{" "}
                    {videoDurationSeconds % 60} ثانية
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl my-auto">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      معاينة مجانية للجميع
                    </p>
                    <p className="text-[10px] text-slate-500">
                      إتاحة مشاهدة هذا الدرس لجميع الزوار بدون اشتراك
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFreePreview}
                    onChange={(e) => setIsFreePreview(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 bg-white border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RICH SUMMARY / NOTES */}
          {activeTab === "summary" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  ملخص الدرس وملاحظات المذاكرة
                </label>
                <span className="text-[11px] text-primary-600">
                  يدعم تنسيق العناوين والنقاط
                </span>
              </div>
              <textarea
                rows={10}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اكتب هنا القوانين الهامة، الملاحظات الإعرابية، ملخص القواعد ونقاط التميز ليقرأها الطالب أسفل مشغل الفيديو..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                يظهر هذا الملخص في تبويب 📖 "ملخص الدرس والملاحظات" للطالب أثناء
                مشاهدة الشرح.
              </p>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS & DOWNLOADS */}
          {activeTab === "attachments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-primary-600" />
                  الملفات والمذكرات المرفقة بالدرس
                </span>
                {!isAddingAttachment && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAttachment(true)}
                    className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-primary-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ملف جديد</span>
                  </button>
                )}
              </div>

              {/* Add Attachment Dropzone Panel */}
              {isAddingAttachment && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      عنوان المرفق (مثال: ملخص الدرس، واجب تدريبي)
                    </label>
                    <input
                      type="text"
                      value={newAttachmentTitle}
                      onChange={(e) => setNewAttachmentTitle(e.target.value)}
                      placeholder="اكتب اسماً واضحاً للملف..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                    />
                  </div>

                  {/* Direct Presigned Document Uploader */}
                  <FileUploadZone
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    folder="courses"
                    label="رفع الملف المرفق (مستند / ورقة عمل)"
                    description="اسحب وأفلت الملف هنا للرفع السحابي الفوري"
                    currentFileUrl={newAttachmentUrl}
                    currentFileKey={newAttachmentKey}
                    onUploadComplete={({
                      fileUrl,
                      fileKey,
                      fileSize,
                      fileType,
                      fileName,
                    }) => {
                      setNewAttachmentUrl(fileUrl);
                      setNewAttachmentKey(fileKey);
                      setNewAttachmentSize(fileSize);
                      setNewAttachmentType(fileType || "application/pdf");
                      if (!newAttachmentTitle)
                        setNewAttachmentTitle(
                          fileName.replace(/\.[^/.]+$/, ""),
                        );
                    }}
                    onRemoveFile={() => {
                      setNewAttachmentUrl("");
                      setNewAttachmentKey("");
                      setNewAttachmentSize(undefined);
                    }}
                    fileCategory="document"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (newAttachmentKey || newAttachmentUrl) {
                          coursesApi.deleteUploadedFile(
                            newAttachmentKey || newAttachmentUrl,
                          );
                        }
                        setNewAttachmentTitle("");
                        setNewAttachmentUrl("");
                        setNewAttachmentKey("");
                        setNewAttachmentSize(undefined);
                        setIsAddingAttachment(false);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      disabled={
                        addAttachmentMutation.isPending || !newAttachmentUrl
                      }
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {addAttachmentMutation.isPending
                        ? "جاري الحفظ..."
                        : "حفظ المرفق"}
                    </button>
                  </div>
                </div>
              )}

              {/* Attachments List */}
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    لا توجد ملفات مرفقة بهذا الدرس حالياً
                  </p>
                ) : (
                  attachments.map((att: LessonAttachment) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {att.title}
                          </p>
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>تحميل / معاينة المستند</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="حذف المرفق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LESSON QUIZ & HOMEWORK LINKING */}
          {activeTab === "quiz" && (
            <div className="space-y-4">
              {/* Header explanation */}
              <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  يمكنك تخصيص <strong>امتحان تقييمي</strong> و<strong>واجب منزلي</strong> معاً لهذا الدرس. يتم حفظ التعديلات وحفظ بيانات الدرس وفيديوهاته تلقائياً أولاً قبل الانتقال لأي منشئ اختبارات.
                </p>
              </div>

              {/* CARD 1: LESSON EXAM / QUIZ */}
              <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>اختبار / امتحان الحصة</span>
                        {lessonQuizId && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                            مرتبط ✓
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        يظهر للطالب فور انتهائه من مشاهدة شرح الدرس لقياس الفهم والاستيعاب.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAndRedirecting}
                    onClick={() => handleSaveAndCreateAssessment("EXAM")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-white hover:bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    title="حفظ الدرس أولاً ثم إنشاء اختبار وربطه تلقائياً به"
                  >
                    {isSavingAndRedirecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>إنشاء اختبار جديد</span>
                    <ExternalLink className="w-3 h-3 mr-0.5 text-purple-400" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    اختر الاختبار المرتبط:
                  </label>
                  <select
                    value={lessonQuizId}
                    onChange={(e) => setLessonQuizId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm cursor-pointer font-medium"
                  >
                    <option value="">-- بدون اختبار لهذا الدرس --</option>
                    {examOptions.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.type === "EXAM" ? "امتحان شامل" : "اختبار قصير"} - {a.totalScore} درجة)
                      </option>
                    ))}
                  </select>
                </div>

                {newAssessmentId && lessonQuizId === newAssessmentId && (
                  <div className="bg-purple-100/80 border border-purple-200 text-purple-900 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
                    <span className="font-semibold">
                      تم ربط وتحديد هذا الاختبار المضاف حديثاً تلقائياً ✓
                    </span>
                  </div>
                )}

                {/* Attempt Policy Selector (shown when an exam is linked) */}
                {lessonQuizId && (
                  <div className="pt-2 border-t border-purple-100/80 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-800">
                      سياسة إعادة الامتحان للطالب:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAllowMultipleAttempts(false)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          !allowMultipleAttempts
                            ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                            : "border-purple-100 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <span className="text-base leading-none">🔒</span>
                        <span>
                          <span className="block text-xs font-bold text-slate-800">
                            محاولة واحدة فقط
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            لا يمكن للطالب إعادة الاختبار بعد تسليمه
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowMultipleAttempts(true)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          allowMultipleAttempts
                            ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                            : "border-purple-100 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <span className="text-base leading-none">🔄</span>
                        <span>
                          <span className="block text-xs font-bold text-slate-800">
                            إعادة غير محدودة
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            يمكن للطالب التدرب وإعادة الاختبار عدة مرات
                          </span>
                        </span>
                      </button>
                    </div>

                    {/* Quiz Optionality Selector */}
                    <div className="pt-2 border-t border-purple-100/60 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-800">
                        إلزامية الاختبار للتقدم:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQuizOptional(false)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            !isQuizOptional
                              ? "border-purple-500 bg-white ring-2 ring-purple-100 shadow-2xs"
                              : "border-purple-100 bg-white/60 hover:bg-white"
                          }`}
                        >
                          <span className="text-base leading-none">⚠️</span>
                          <span>
                            <span className="block text-xs font-bold text-slate-800">
                              إجباري (مطلوب)
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              يجب حله واجتيازه لفتح الدرس أو الوحدة التالية
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsQuizOptional(true)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            isQuizOptional
                              ? "border-emerald-500 bg-white ring-2 ring-emerald-100 shadow-2xs"
                              : "border-purple-100 bg-white/60 hover:bg-white"
                          }`}
                        >
                          <span className="text-base leading-none">✨</span>
                          <span>
                            <span className="block text-xs font-bold text-slate-800">
                              اختياري (يمكن تجاوزه)
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              يمكن للطالب تجاوزه والانتقال للخطوة التالية مباشرة
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: LESSON HOMEWORK / ASSIGNMENT */}
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>واجب الحصة المنزلي</span>
                        {lessonHomeworkId && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                            مرتبط ✓
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        واجب تدريبي وتطبيقي يلتزم الطالب بحله وتسليمه بعد الانتهاء من الدرس.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingAndRedirecting}
                    onClick={() => handleSaveAndCreateAssessment("ASSIGNMENT")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                    title="حفظ الدرس أولاً ثم إنشاء واجب وربطه تلقائياً به"
                  >
                    {isSavingAndRedirecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>إنشاء واجب جديد</span>
                    <ExternalLink className="w-3 h-3 mr-0.5 text-blue-400" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    اختر الواجب المرتبط:
                  </label>
                  <select
                    value={lessonHomeworkId}
                    onChange={(e) => setLessonHomeworkId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm cursor-pointer font-medium"
                  >
                    <option value="">-- بدون واجب لهذا الدرس --</option>
                    {homeworkOptions.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} (واجب - {a.totalScore} درجة)
                      </option>
                    ))}
                  </select>
                </div>

                {newAssessmentId && lessonHomeworkId === newAssessmentId && (
                  <div className="bg-blue-100/80 border border-blue-200 text-blue-900 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="font-semibold">
                      تم ربط وتحديد هذا الواجب المضاف حديثاً تلقائياً ✓
                    </span>
                  </div>
                )}

                {/* Homework Optionality Selector */}
                {lessonHomeworkId && (
                  <div className="pt-2 border-t border-blue-100/80 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-800">
                      إلزامية الواجب المنزلي:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsHomeworkOptional(false)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          !isHomeworkOptional
                            ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-2xs"
                            : "border-blue-100 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <span className="text-base leading-none">⚠️</span>
                        <span>
                          <span className="block text-xs font-bold text-slate-800">
                            واجب إجباري
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            مطلوب حله وتسليمه لفتح المحتوى القادم
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsHomeworkOptional(true)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          isHomeworkOptional
                            ? "border-emerald-500 bg-white ring-2 ring-emerald-100 shadow-2xs"
                            : "border-blue-100 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <span className="text-base leading-none">✨</span>
                        <span>
                          <span className="block text-xs font-bold text-slate-800">
                            واجب اختياري (تطبيقي)
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            يمكن للطالب تجاوزه إن رغب
                          </span>
                        </span>
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        تم ربط هذا الواجب بنجاح بهذا الدرس
                      </span>
                      <a
                        href={`/teacher/assessments/${lessonHomeworkId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>معاينة وتعديل الأسئلة</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveLesson}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>{isEditing ? "حفظ التعديلات" : "إضافة الدرس للمنهج"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
