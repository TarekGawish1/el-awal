"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Video,
  FileText,
  Paperclip,
  Award,
  UploadCloud,
  CheckCircle,
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
import toast from "react-hot-toast";

interface LessonEditorModalProps {
  isOpen: boolean;
  courseId: string;
  moduleId: string;
  lesson?: CourseLesson | null;
  onClose: () => void;
}

type TabType = "video" | "summary" | "attachments" | "quiz";

export function LessonEditorModal({
  isOpen,
  courseId,
  moduleId,
  lesson,
  onClose,
}: LessonEditorModalProps) {
  const isEditing = !!lesson;
  const createMutation = useCreateLesson(courseId);
  const updateMutation = useUpdateLesson(courseId);
  const addAttachmentMutation = useAddAttachment(courseId);
  const deleteAttachmentMutation = useDeleteAttachment(courseId);

  const { data: streamAuth } = useLessonStreamAuth(lesson?.id || "");

  const { data: assessmentsData } = useAssessments();
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : assessmentsData?.data || [];

  const [activeTab, setActiveTab] = useState<TabType>("video");

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
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
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

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || "");
      setDescription(lesson.description || "");
      setSummary(lesson.summary || "");
      setLessonType(lesson.lessonType || "VIDEO");
      setBunnyVideoId(lesson.bunnyVideoId || "");
      setVideoEmbedUrl("");
      setVideoDurationSeconds(lesson.videoDurationSeconds || 1800);
      setIsFreePreview(lesson.isPreview || false);
      setLessonQuizId(lesson.lessonQuizId || "");
      setAttachments(lesson.attachments || []);
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
      setAttachments([]);
    }
  }, [lesson, isOpen]);

  // Sync streamAuth embed URL when available
  useEffect(() => {
    if (streamAuth?.embedUrl && !videoEmbedUrl) {
      setVideoEmbedUrl(streamAuth.embedUrl);
    }
  }, [streamAuth, videoEmbedUrl]);

  // Reflect the selected quiz's current attempt policy in the toggle (or reset when none).
  useEffect(() => {
    if (!lessonQuizId) {
      setAllowMultipleAttempts(false);
      return;
    }
    const selected = assessments.find((a: any) => a.id === lessonQuizId);
    if (selected) {
      setAllowMultipleAttempts(Boolean(selected.allowMultipleAttempts ?? false));
    }
  }, [lessonQuizId, assessments]);

  if (!isOpen) return null;

  const handleCancelUpload = () => {
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

      // Request secure Direct Upload credentials (Bunny Stream with Cloudflare R2 fallback)
      const creds = await coursesApi.getVideoUploadCredentials(
        title.trim() || file.name,
      );
      setVideoUploadProgress(15);

      const xhr = new XMLHttpRequest();
      uploadXhrRef.current = xhr;
      xhr.open("PUT", creds.uploadUrl);

      if (creds.provider === "r2") {
        // Cloudflare R2 Presigned PUT requires exact Content-Type and no Bunny headers
        xhr.setRequestHeader("Content-Type", "video/mp4");
      } else {
        // Bunny Stream headers
        if (creds.accessKey) xhr.setRequestHeader("AccessKey", creds.accessKey);
        if (creds.authorizationSignature)
          xhr.setRequestHeader(
            "AuthorizationSignature",
            creds.authorizationSignature,
          );
        if (creds.authorizationExpire)
          xhr.setRequestHeader(
            "AuthorizationExpire",
            String(creds.authorizationExpire),
          );
        if (creds.libraryId) xhr.setRequestHeader("LibraryId", creds.libraryId);
        if (creds.videoId) xhr.setRequestHeader("VideoId", creds.videoId);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
      }

      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5) {
            const bytesDiff = event.loaded - lastLoaded;
            const speed = (bytesDiff / timeDiff) / (1024 * 1024); // MB/s
            setUploadSpeedMbps(parseFloat(speed.toFixed(2)));

            const remainingBytes = event.total - event.loaded;
            const remainingSeconds = speed > 0 ? (remainingBytes / (1024 * 1024)) / speed : 0;
            setEtaSeconds(Math.ceil(remainingSeconds));

            lastLoaded = event.loaded;
            lastTime = now;
          }

          setUploadedBytes(event.loaded);
          setTotalBytes(event.total);
          const percent = Math.round((event.loaded / event.total) * 80) + 15;
          setVideoUploadProgress(Math.min(percent, 98));
        }
      };

      xhr.onload = () => {
        uploadXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          setVideoUploadProgress(100);
          setIsUploadingVideo(false);
          setBunnyVideoId(creds.videoId);
          setVideoEmbedUrl(creds.embedUrl);
          toast.success(
            creds.provider === "r2"
              ? "تم رفع الفيديو بنجاح إلى السيرفر السحابي!"
              : "تم رفع الفيديو بنجاح! جاري معالجة وتشفير البث السحابي",
          );
        } else {
          setIsUploadingVideo(false);
          toast.error(`تعذر رفع الفيديو إلى سيرفر البث السحابي (كود: ${xhr.status})`);
        }
      };

      xhr.onerror = () => {
        uploadXhrRef.current = null;
        setIsUploadingVideo(false);
        toast.error("حدث خطأ في الاتصال أثناء رفع الفيديو");
      };

      xhr.send(file);
    } catch (err: any) {
      uploadXhrRef.current = null;
      setIsInspectingVideo(false);
      setIsUploadingVideo(false);
      toast.error(err?.message || "تعذر الحصول على تصريح رفع الفيديو");
    } finally {
      e.target.value = "";
    }
  };

  const handleRemoveVideo = async () => {
    if (bunnyVideoId) {
      coursesApi.deleteUploadedFile(`bunny:${bunnyVideoId}`);
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

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      summary: summary.trim() || undefined,
      lessonType,
      bunnyVideoId: bunnyVideoId && !bunnyVideoId.startsWith("r2:") ? bunnyVideoId : undefined,
      contentUrl: videoEmbedUrl || (bunnyVideoId && bunnyVideoId.startsWith("r2:") ? videoEmbedUrl : undefined),
      videoDurationSeconds: Number(videoDurationSeconds) || 0,
      isFreePreview,
      isPreview: isFreePreview,
      lessonQuizId: lessonQuizId || undefined,
      attachments: stagedAttachments.length > 0 ? stagedAttachments : undefined,
    };

    try {
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

      // Persist the selected assessment's retake policy (single vs. multiple attempts).
      if (lessonQuizId) {
        try {
          await updateAssessment(lessonQuizId, { allowMultipleAttempts });
        } catch {
          // Best-effort: a policy update failure must not block saving the lesson.
        }
      }

      onClose();
    } catch {
      // Handled by mutation toast
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
            onClick={onClose}
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
              <span>اختبار الدرس</span>
              {lessonQuizId && (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
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
                    {bunnyVideoId && (
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
                {bunnyVideoId ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
                    <div
                      className="relative w-full aspect-video bg-black rounded-t-2xl overflow-hidden flex items-center justify-center"
                      style={{ aspectRatio: "16 / 9", width: "100%" }}
                    >
                      {videoEmbedUrl?.includes('.b-cdn.net') || videoEmbedUrl?.includes('iframe.mediadelivery.net') || streamAuth?.embedUrl ? (
                        <iframe
                          src={videoEmbedUrl || streamAuth?.embedUrl}
                          loading="lazy"
                          className="w-full h-full border-0 absolute inset-0 block"
                          style={{ width: "100%", height: "100%", border: 0 }}
                          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                          allowFullScreen
                        />
                      ) : videoEmbedUrl ? (
                        <video
                          src={videoEmbedUrl}
                          controls
                          className="w-full h-full object-contain"
                          style={{ width: "100%", height: "100%" }}
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
                            {uploadedVideoName || "فيديو الشرح المباشر"}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                            <span>ID: {bunnyVideoId}</span>
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
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-600">
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

          {/* TAB 4: LESSON QUIZ LINKING */}
          {activeTab === "quiz" && (
            <div className="space-y-4">
              <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      ربط اختبار سريع أو واجب خاص بهذا الدرس
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      يظهر هذا الاختبار للطالب في نافذة المشغل فور انتهائه من
                      مشاهدة الفيديو لقياس مستوى الفهم.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <label className="block text-xs font-bold text-slate-800">
                      اختر الاختبار أو الواجب المرتبط:
                    </label>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/teacher/assessments/new?type=EXAM&courseId=${courseId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer"
                        title="إنشاء اختبار جديد في نافذة جديدة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إنشاء اختبار جديد</span>
                        <ExternalLink className="w-3 h-3 mr-0.5 text-primary-400" />
                      </a>
                      <a
                        href={`/teacher/assessments/new?type=ASSIGNMENT&courseId=${courseId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer"
                        title="إنشاء واجب جديد في نافذة جديدة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إنشاء واجب</span>
                        <ExternalLink className="w-3 h-3 mr-0.5 text-slate-400" />
                      </a>
                    </div>
                  </div>

                  {assessments.length === 0 ? (
                    <div className="p-4 bg-white border border-dashed border-amber-300 rounded-xl text-center space-y-2.5 mt-2">
                      <p className="text-xs font-bold text-slate-800">
                        لا توجد اختبارات أو واجبات منشأة حالياً في حسابك
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
                        يتم إنشاء وبناء الامتحانات والأسئلة أولاً من قسم{" "}
                        <strong>"الامتحانات والواجبات"</strong>، وبعد حفظها
                        ستظهر في هذه القائمة مباشرة لربطها بالدرس.
                      </p>
                      <div className="pt-1 flex justify-center gap-2">
                        <a
                          href={`/teacher/assessments/new?type=EXAM&courseId=${courseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إنشاء اختبار جديد لهذا الكورس</span>
                          <ExternalLink className="w-3 h-3 mr-0.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={lessonQuizId}
                        onChange={(e) => setLessonQuizId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- بدون اختبار لهذا الدرس --</option>
                        {assessments.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.title} (
                            {a.type === "EXAM"
                              ? "امتحان شامل"
                              : a.type === "HOMEWORK"
                                ? "واجب"
                                : "اختبار قصير"}{" "}
                            - {a.totalScore} درجة)
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        💡 يمكنك النقر على <strong>"إنشاء اختبار جديد"</strong>{" "}
                        بالأعلى لفتح نموذج إنشاء الاختبارات وربطه تلقائياً بهذا
                        الكورس.
                      </p>
                    </div>
                  )}

                  {/* Attempt Policy Selector (shown once a quiz is linked) */}
                  {lessonQuizId && (
                    <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                      <label className="block text-xs font-bold text-slate-800">
                        سياسة إعادة الاختبار للطالب:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAllowMultipleAttempts(false)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all ${
                            !allowMultipleAttempts
                              ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-100"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-lg leading-none">🔒</span>
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
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all ${
                            allowMultipleAttempts
                              ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-100"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-lg leading-none">🔄</span>
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
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
