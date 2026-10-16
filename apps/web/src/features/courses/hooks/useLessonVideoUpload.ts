"use client";

import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { coursesApi } from "../api/courses.api";
import {
  validateVideoFile,
  extractVideoMetadata,
  VideoMetadata,
} from "../utils/video-optimizer";
import { useVideoUploadManager } from "../context/video-upload-manager.context";

export interface UseLessonVideoUploadProps {
  courseId: string;
  moduleId: string;
  lesson?: any;
  resolvedLessonId: string | null;
  streamAuth?: any;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
}

export function useLessonVideoUpload({
  courseId,
  moduleId,
  lesson,
  resolvedLessonId,
  streamAuth,
  title,
  setTitle,
}: UseLessonVideoUploadProps) {
  const [bunnyVideoId, setBunnyVideoId] = useState("");
  const [videoEmbedUrl, setVideoEmbedUrl] = useState("");
  const [uploadedVideoName, setUploadedVideoName] = useState("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(1800);

  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isInspectingVideo, setIsInspectingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadSpeedMbps, setUploadSpeedMbps] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);

  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);
  const initialBunnyVideoIdRef = useRef<string | null>(null);
  const currentBunnyVideoIdRef = useRef<string | null>(null);

  const {
    startUpload: startBackgroundUpload,
    cancelUpload: cancelBackgroundUpload,
    getTaskForLesson,
    dismissTask,
  } = useVideoUploadManager();

  const backgroundUploadTask = getTaskForLesson(
    resolvedLessonId || undefined,
    moduleId,
  );

  // Sync background upload task to state
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
        setVideoDurationSeconds((prev) =>
          prev === 1800 ? backgroundUploadTask.durationSeconds! : prev,
        );
      }
      if (backgroundUploadTask.fileName) {
        setUploadedVideoName(
          (prev) => prev || backgroundUploadTask.fileName || "",
        );
      }
    } else if (
      backgroundUploadTask.status === "error" ||
      backgroundUploadTask.status === "aborted"
    ) {
      setIsUploadingVideo(false);
      setIsInspectingVideo(false);
    }
  }, [backgroundUploadTask]);

  // Sync streamAuth embed URL and videoId when available
  useEffect(() => {
    if (streamAuth?.videoId) {
      setBunnyVideoId((prev) => prev || streamAuth.videoId);
    }
    if (streamAuth?.embedUrl) {
      setVideoEmbedUrl((prev) => prev || streamAuth.embedUrl);
    }
  }, [streamAuth]);

  useEffect(() => {
    currentBunnyVideoIdRef.current = bunnyVideoId || null;
  }, [bunnyVideoId]);

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

    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(
        validation.error ||
          "حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)",
      );
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

      toast.success(
        "بدأ رفع ومعالجة الفيديو بنجاح! يرجى الانتظار حتى اكتمال الرفع.",
      );
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

  return {
    bunnyVideoId,
    setBunnyVideoId,
    videoEmbedUrl,
    setVideoEmbedUrl,
    uploadedVideoName,
    setUploadedVideoName,
    videoDurationSeconds,
    setVideoDurationSeconds,
    isUploadingVideo,
    isInspectingVideo,
    videoUploadProgress,
    uploadSpeedMbps,
    uploadedBytes,
    totalBytes,
    etaSeconds,
    videoMeta,
    backgroundUploadTask,
    handleDirectVideoUpload,
    handleCancelUpload,
    handleRemoveVideo,
    initialBunnyVideoIdRef,
    currentBunnyVideoIdRef,
  };
}
