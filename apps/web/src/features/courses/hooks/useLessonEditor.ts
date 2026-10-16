"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LessonAttachment } from "../types/courses.types";
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
  VideoMetadata,
} from "../utils/video-optimizer";
import { useVideoUploadManager } from "../context/video-upload-manager.context";
import {
  LessonEditorModalProps,
  LessonEditorTabType,
  UseLessonEditorReturn,
} from "../types/lesson-editor.types";


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

  const createMutation = useCreateLesson(courseId);
  const updateMutation = useUpdateLesson(courseId);
  const addAttachmentMutation = useAddAttachment(courseId);
  const deleteAttachmentMutation = useDeleteAttachment(courseId);

  const queryClient = useQueryClient();
  const { data: streamAuth } = useLessonStreamAuth(resolvedLessonId || "", { enabled: isOpen });

  const { data: assessmentsData } = useAssessments(undefined, { enabled: isOpen });
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : assessmentsData?.data || [];

  const [activeTab, setActiveTab] = useState<LessonEditorTabType>(initialTab || "video");

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
  const [allowHomeworkMultipleAttempts, setAllowHomeworkMultipleAttempts] = useState(false);
  const [isQuizOptional, setIsQuizOptional] = useState(false);
  const [isHomeworkOptional, setIsHomeworkOptional] = useState(false);
  const [isQuizPassRequired, setIsQuizPassRequired] = useState(false);
  const [isHomeworkPassRequired, setIsHomeworkPassRequired] = useState(false);
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
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  // New Attachment State
  const [newAttachmentTitle, setNewAttachmentTitle] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newAttachmentKey, setNewAttachmentKey] = useState("");
  const [newAttachmentSize, setNewAttachmentSize] = useState<number | undefined>();
  const [newAttachmentType, setNewAttachmentType] = useState<string>("application/pdf");
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);

  const isSubmittedRef = useRef(false);
  const initialBunnyVideoIdRef = useRef<string | null>(null);
  const currentBunnyVideoIdRef = useRef<string | null>(null);
  const attachmentsRef = useRef<LessonAttachment[]>([]);
  const initialQuizIdRef = useRef<string | null>(null);
  const initialHomeworkIdRef = useRef<string | null>(null);
  const lastLoadedQuizIdRef = useRef<string | null>(null);
  const lastLoadedHomeworkIdRef = useRef<string | null>(null);

  const {
    startUpload: startBackgroundUpload,
    cancelUpload: cancelBackgroundUpload,
    getTaskForLesson,
    dismissTask,
  } = useVideoUploadManager();

  const backgroundUploadTask = getTaskForLesson(resolvedLessonId || undefined, moduleId);

  // Merge general assessments with any specific assessments linked on the lesson object
  const allAvailableAssessments = useMemo(() => {
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
    if (newAssessmentId && !map.has(newAssessmentId)) {
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
        allowMultipleAttempts: false,
        isOptional: false,
        requirePassingScore: false,
      });
    }
    return Array.from(map.values());
  }, [assessments, lesson, newAssessmentId, newAssessmentType, newAssessmentTitle]);

  const examOptions = useMemo(() => {
    return allAvailableAssessments.filter(
      (a: any) => a?.type === "EXAM" || a?.type === "QUIZ",
    );
  }, [allAvailableAssessments]);

  const homeworkOptions = useMemo(() => {
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

    // Clean up query parameters from URL so refreshes/re-renders don't re-trigger
    if (typeof window !== "undefined" && window.location.search.includes("newAssessmentId")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("newAssessmentId");
      url.searchParams.delete("newAssessmentType");
      url.searchParams.delete("newAssessmentTitle");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [newAssessmentId, newAssessmentType, lesson?.id, courseId]);

  useEffect(() => {
    isSubmittedRef.current = false;
    initialBunnyVideoIdRef.current = lesson?.bunnyVideoId || null;
    autoCreatedLessonIdRef.current = null;
    setAutoCreatedLessonId(null);
    if (lesson) {
      setTitle(lesson.title || "");
      setDescription(lesson.description || "");
      setSummary(lesson.summary || "");
      setLessonType(lesson.lessonType || "VIDEO");

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
      setIsQuizPassRequired(false);
      setIsHomeworkPassRequired(false);
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

  // Reflect the selected quiz's current attempt policy, optionality, and pass requirement
  useEffect(() => {
    if (!lessonQuizId) {
      lastLoadedQuizIdRef.current = null;
      setAllowMultipleAttempts(false);
      setIsQuizOptional(false);
      setIsQuizPassRequired(false);
      return;
    }
    if (lastLoadedQuizIdRef.current !== lessonQuizId) {
      const selected = allAvailableAssessments.find((a: any) => a.id === lessonQuizId);
      if (selected) {
        lastLoadedQuizIdRef.current = lessonQuizId;
        const passReq = Boolean(selected.requirePassingScore ?? false);
        setAllowMultipleAttempts(passReq ? true : Boolean(selected.allowMultipleAttempts ?? false));
        setIsQuizOptional(passReq ? false : Boolean(selected.isOptional ?? false));
        setIsQuizPassRequired(passReq);
      }
    }
  }, [lessonQuizId, allAvailableAssessments]);

  // Reflect the selected homework's attempt policy, optionality, and pass requirement
  useEffect(() => {
    if (!lessonHomeworkId) {
      lastLoadedHomeworkIdRef.current = null;
      setAllowHomeworkMultipleAttempts(false);
      setIsHomeworkOptional(false);
      setIsHomeworkPassRequired(false);
      return;
    }
    if (lastLoadedHomeworkIdRef.current !== lessonHomeworkId) {
      const selected = allAvailableAssessments.find((a: any) => a.id === lessonHomeworkId);
      if (selected) {
        lastLoadedHomeworkIdRef.current = lessonHomeworkId;
        const passReq = Boolean(selected.requirePassingScore ?? false);
        setAllowHomeworkMultipleAttempts(passReq ? true : Boolean(selected.allowMultipleAttempts ?? false));
        setIsHomeworkOptional(passReq ? false : Boolean(selected.isOptional ?? false));
        setIsHomeworkPassRequired(passReq);
      }
    }
  }, [lessonHomeworkId, allAvailableAssessments]);

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

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      try {
        const meta = await extractVideoMetadata(file);
        setVideoMeta(meta);
        if (meta.durationSeconds > 0) {
          setVideoDurationSeconds(meta.durationSeconds);
        }
      } catch (metaErr) {
        console.warn("Video metadata inspection skipped:", metaErr);
      } finally {
        setIsInspectingVideo(false);
      }

      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }

      const targetLessonId = lesson?.id || undefined;

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
          setIsUploadingVideo(false);
        },
      });

      toast.success("بدأ رفع ومعالجة الفيديو بنجاح! يرجى الانتظار حتى اكتمال الرفع.");
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

    const isBunnyUrl = (u?: string) =>
      !!u && (u.includes("iframe.mediadelivery.net") || u.includes("video.bunnycdn.com") || u.startsWith("bunny:"));
    const rawContentCandidate =
      (!(videoEmbedUrl && isBunnyUrl(videoEmbedUrl)) ? videoEmbedUrl : undefined) ||
      (!(backgroundUploadTask?.embedUrl && isBunnyUrl(backgroundUploadTask.embedUrl))
        ? backgroundUploadTask?.embedUrl
        : undefined) ||
      (!(streamAuth?.embedUrl && isBunnyUrl(streamAuth.embedUrl)) ? streamAuth?.embedUrl : undefined);
    const effectiveContentUrl = effectiveVideoId ? undefined : rawContentCandidate;

    if (isUploadingVideo) {
      toast.error("يرجى الانتظار حتى يكتمل رفع ومعالجة الفيديو قبل حفظ الدرس ⏳");
      return;
    }

    if (!effectiveVideoId && !effectiveContentUrl) {
      toast.error("يجب رفع أو اختيار فيديو لهذا الدرس 🎥 (لا يمكن حفظ الدرس بدون فيديو)");
      return;
    }

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
      let savedLessonId: string | undefined = resolvedLessonId || undefined;
      if (isEditingEffective && resolvedLessonId) {
        await updateMutation.mutateAsync({
          lessonId: resolvedLessonId,
          data: payload,
        });
      } else {
        const newLesson = await createMutation.mutateAsync({
          moduleId,
          data: payload,
        });
        savedLessonId = newLesson?.id;

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
            allowMultipleAttempts: isQuizPassRequired ? true : allowMultipleAttempts,
            isOptional: isQuizPassRequired ? false : isQuizOptional,
            requirePassingScore: isQuizPassRequired,
            lessonId: savedLessonId,
            courseId,
          });
        } catch {
          // Best-effort
        }
      }
      if (initialQuizIdRef.current && initialQuizIdRef.current !== lessonQuizId) {
        try {
          await updateAssessment(initialQuizIdRef.current, {
            lessonId: null,
          });
        } catch {}
      }

      // 2. Link or unlink homework
      if (savedLessonId) {
        if (lessonHomeworkId) {
          try {
            await updateAssessment(lessonHomeworkId, {
              isOptional: isHomeworkPassRequired ? false : isHomeworkOptional,
              requirePassingScore: isHomeworkPassRequired,
              allowMultipleAttempts: isHomeworkPassRequired ? true : allowHomeworkMultipleAttempts,
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

      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success(isEditing ? "تم حفظ التعديلات بنجاح" : "تمت إضافة الدرس بنجاح");
      onClose();
    } catch {
      isSubmittedRef.current = false;
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

    const isBunnyUrl2 = (u?: string) =>
      !!u && (u.includes("iframe.mediadelivery.net") || u.includes("video.bunnycdn.com") || u.startsWith("bunny:"));
    const rawContentCandidate2 =
      (!(videoEmbedUrl && isBunnyUrl2(videoEmbedUrl)) ? videoEmbedUrl : undefined) ||
      (!(backgroundUploadTask?.embedUrl && isBunnyUrl2(backgroundUploadTask.embedUrl))
        ? backgroundUploadTask?.embedUrl
        : undefined) ||
      (!(streamAuth?.embedUrl && isBunnyUrl2(streamAuth.embedUrl)) ? streamAuth?.embedUrl : undefined);
    const effectiveContentUrl = effectiveVideoId ? undefined : rawContentCandidate2;

    if (isUploadingVideo) {
      toast.error("يرجى الانتظار حتى يكتمل رفع ومعالجة الفيديو قبل حفظ الدرس ⏳");
      return;
    }

    if (!effectiveVideoId && !effectiveContentUrl) {
      toast.error("يجب رفع أو اختيار فيديو لهذا الدرس 🎥 (لا يمكن حفظ الدرس بدون فيديو)");
      setActiveTab("video");
      return;
    }

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
      isSubmittedRef.current = true;

      let targetLessonId = resolvedLessonId || undefined;

      if (isEditingEffective && resolvedLessonId) {
        await updateMutation.mutateAsync({
          lessonId: resolvedLessonId,
          data: payload,
        });
        targetLessonId = resolvedLessonId;
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
    videoDurationSeconds,
    setVideoDurationSeconds,
    isFreePreview,
    setIsFreePreview,

    bunnyVideoId,
    videoEmbedUrl,
    uploadedVideoName,
    isUploadingVideo,
    isInspectingVideo,
    videoUploadProgress,
    uploadSpeedMbps,
    uploadedBytes,
    totalBytes,
    etaSeconds,
    videoMeta,
    streamAuth,
    backgroundUploadTask,
    handleDirectVideoUpload,
    handleCancelUpload,
    handleRemoveVideo,

    attachments,
    isAddingAttachment,
    setIsAddingAttachment,
    newAttachmentTitle,
    setNewAttachmentTitle,
    newAttachmentUrl,
    setNewAttachmentUrl,
    newAttachmentKey,
    setNewAttachmentKey,
    newAttachmentSize,
    setNewAttachmentSize,
    newAttachmentType,
    setNewAttachmentType,
    handleAddAttachment,
    handleDeleteAttachment,
    isAddingAttachmentLoading: addAttachmentMutation.isPending,

    lessonQuizId,
    setLessonQuizId,
    lessonHomeworkId,
    setLessonHomeworkId,
    allowMultipleAttempts,
    setAllowMultipleAttempts,
    allowHomeworkMultipleAttempts,
    setAllowHomeworkMultipleAttempts,
    isQuizOptional,
    setIsQuizOptional,
    isHomeworkOptional,
    setIsHomeworkOptional,
    isQuizPassRequired,
    setIsQuizPassRequired,
    isHomeworkPassRequired,
    setIsHomeworkPassRequired,
    examOptions,
    homeworkOptions,
    handleSaveAndCreateAssessment,

    handleSaveLesson,
    handleCancel,
  };
}
