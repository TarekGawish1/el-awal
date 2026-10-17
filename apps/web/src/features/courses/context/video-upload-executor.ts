import { toast } from 'react-hot-toast';
import type { QueryClient } from '@tanstack/react-query';
import { coursesApi } from '../api/courses.api';
import {
  extractVideoMetadata,
  VideoMetadata,
} from '../utils/video-optimizer';
import type { BunnyTusUploadInstance } from '../utils/bunny-tus-uploader';
import type { StartUploadOptions, VideoUploadTask } from '../types/video-upload.types';

export interface ExecuteVideoUploadParams {
  options: StartUploadOptions;
  taskId: string;
  updateTask: (taskId: string, patch: Partial<VideoUploadTask>) => void;
  activeXhrsRef: React.MutableRefObject<Record<string, XMLHttpRequest>>;
  activeTusUploadsRef: React.MutableRefObject<Record<string, BunnyTusUploadInstance>>;
  tasksRef: React.MutableRefObject<Record<string, VideoUploadTask>>;
  queryClient: QueryClient;
}

export async function executeVideoUpload({
  options,
  taskId,
  updateTask,
  activeXhrsRef,
  activeTusUploadsRef,
  tasksRef,
  queryClient,
}: ExecuteVideoUploadParams): Promise<void> {
  const {
    file,
    lessonId,
    courseId,
    lessonTitle,
    isCoursePreview,
    oldPreviewUrl,
    onSuccess,
  } = options;

  let metaDuration = 0;
  let metaData: VideoMetadata | null = null;
  try {
    metaData = await extractVideoMetadata(file);
    if (metaData?.durationSeconds) {
      metaDuration = metaData.durationSeconds;
    }
  } catch (metaErr) {
    console.warn('Video metadata inspection skipped:', metaErr);
  }

  updateTask(taskId, {
    status: 'uploading',
    progress: 10,
    videoMeta: metaData,
    durationSeconds: metaDuration,
  });

  // Helper to finalize upload success and auto-save metadata
  const finalizeSuccess = async (result: {
    videoId: string;
    embedUrl: string;
    provider?: 'bunny';
  }) => {
    updateTask(taskId, {
      status: 'completed',
      progress: 100,
      videoId: result.videoId,
      embedUrl: result.embedUrl,
      durationSeconds: metaDuration,
      completedAt: new Date(),
    });

    // If lessonId is already known, auto-save video details to the lesson in background.
    const currentTaskState = tasksRef.current[taskId];
    const targetLessonId = currentTaskState?.lessonId || lessonId;

    if (targetLessonId) {
      try {
        await coursesApi.updateLesson(targetLessonId, {
          bunnyVideoId: result.videoId,
          contentUrl: null as any,
          videoDurationSeconds: metaDuration,
        });
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({
          queryKey: ['lesson-stream-auth', targetLessonId],
        });
      } catch (saveErr) {
        console.warn('Auto background update of lesson failed:', saveErr);
      }
    }

    // If courseId and isCoursePreview are set, auto-save preview video to course in background
    const isPreview = currentTaskState?.isCoursePreview ?? isCoursePreview;
    const targetCourseId = currentTaskState?.courseId || courseId;

    if (isPreview && targetCourseId) {
      try {
        await coursesApi.updateCourse(targetCourseId, {
          previewVideoUrl: `bunny:${result.videoId}` as any,
        });
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({
          queryKey: ['course-details', targetCourseId],
        });
        queryClient.invalidateQueries({
          queryKey: ['course-outline', targetCourseId],
        });
        queryClient.invalidateQueries({
          queryKey: ['course-public-details', targetCourseId],
        });

        // Clean up previous preview video from Bunny if replaced
        const prevUrl = currentTaskState?.oldPreviewUrl || oldPreviewUrl;
        if (prevUrl && prevUrl !== result.embedUrl) {
          coursesApi.deleteUploadedFile(prevUrl).catch(() => {});
        }
      } catch (saveErr) {
        console.warn('Auto background update of course preview video failed:', saveErr);
      }
    }

    toast.success(
      `تم اكتمال رفع فيديو "${lessonTitle || file.name}" بنجاح! 🚀`,
      { duration: 6000 },
    );

    if (onSuccess) {
      onSuccess({
        videoId: result.videoId,
        embedUrl: result.embedUrl,
        durationSeconds: metaDuration,
      });
    }
  };

  // Fallback: upload directly to Bunny Stream via secure server proxy
  const executeServerFallback = async (reason?: string) => {
    if (activeXhrsRef.current[taskId]) {
      try {
        activeXhrsRef.current[taskId].abort();
      } catch {}
      delete activeXhrsRef.current[taskId];
    }

    console.warn(
      `Direct browser Bunny upload interrupted (${reason || 'network/cors'}). Switching to secure server upload to Bunny Stream for: ${lessonTitle || file.name}`,
    );

    updateTask(taskId, {
      status: 'uploading',
      progress: 20,
      uploadedBytes: 0,
      speedMbps: 0,
      etaSeconds: 0,
      provider: 'bunny',
    });

    toast(
      `جاري استكمال رفع "${lessonTitle || file.name}" إلى سيرفر البث (Bunny Stream)...`,
      { icon: '🔄', duration: 4000 },
    );

    let lastLoaded = 0;
    let lastTime = Date.now();

    const currentVideoId = tasksRef.current[taskId]?.videoId;
    const fallbackResult = await coursesApi.uploadVideoDirectToServer(
      file,
      lessonTitle.trim() || file.name,
      (percent, loaded, total) => {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        let currentSpeed = 0;
        let eta = 0;

        if (timeDiff >= 0.5) {
          const bytesDiff = loaded - lastLoaded;
          currentSpeed = bytesDiff / timeDiff / (1024 * 1024);
          const remainingBytes = total - loaded;
          eta = currentSpeed > 0 ? remainingBytes / (1024 * 1024) / currentSpeed : 0;
          lastLoaded = loaded;
          lastTime = now;
        }

        updateTask(taskId, {
          uploadedBytes: loaded,
          totalBytes: total,
          progress: Math.min(Math.round((percent / 100) * 75) + 20, 98),
          speedMbps: currentSpeed > 0 ? parseFloat(currentSpeed.toFixed(2)) : undefined,
          etaSeconds: eta > 0 ? Math.ceil(eta) : undefined,
        });
      },
      currentVideoId,
      (xhr) => {
        activeXhrsRef.current[taskId] = xhr;
      },
    );

    delete activeXhrsRef.current[taskId];

    await finalizeSuccess({
      videoId: fallbackResult.videoId,
      embedUrl: fallbackResult.embedUrl,
      provider: 'bunny',
    });
  };

  try {
    const creds = await coursesApi.getVideoUploadCredentials(
      lessonTitle.trim() || file.name,
    );

    updateTask(taskId, {
      progress: 15,
      provider: creds.provider,
      videoId: creds.videoId,
      embedUrl: creds.embedUrl,
    });

    // Upload directly to Bunny Stream using official TUS resumable protocol
    const { createBunnyTusUpload } = await import('../utils/bunny-tus-uploader');
    const tusUpload = createBunnyTusUpload({
      file,
      videoId: creds.videoId,
      libraryId: creds.libraryId,
      authorizationSignature: creds.authorizationSignature,
      authorizationExpire: creds.authorizationExpire,
      title: lessonTitle.trim() || file.name,
      onProgress: (percent, loaded, total, speed, eta) => {
        updateTask(taskId, {
          uploadedBytes: loaded,
          totalBytes: total,
          progress: percent,
          speedMbps: speed > 0 ? speed : undefined,
          etaSeconds: eta > 0 ? eta : undefined,
        });
      },
      onSuccess: async () => {
        delete activeTusUploadsRef.current[taskId];
        await finalizeSuccess({
          videoId: creds.videoId,
          embedUrl: creds.embedUrl,
          provider: creds.provider,
        });
      },
      onError: async (error) => {
        delete activeTusUploadsRef.current[taskId];
        console.warn(
          '[VideoUploadManager] Bunny TUS direct upload interrupted, falling back to server upload:',
          error,
        );
        try {
          await executeServerFallback(error?.message || 'tus_error');
        } catch (fallbackErr: any) {
          delete activeXhrsRef.current[taskId];
          updateTask(taskId, {
            status: 'error',
            error: fallbackErr?.message || 'حدث خطأ في الاتصال أثناء رفع الفيديو',
          });
          toast.error(
            `حدث خطأ في الاتصال أثناء رفع فيديو "${lessonTitle || file.name}"`,
          );
        }
      },
    });

    activeTusUploadsRef.current[taskId] = tusUpload;
    tusUpload.start();
  } catch (err: any) {
    console.warn('[VideoUploadManager] Credential generation failed, falling back to server upload:', err);
    try {
      await executeServerFallback(err?.message || 'credential_generation_error');
    } catch (fallbackErr: any) {
      delete activeTusUploadsRef.current[taskId];
      delete activeXhrsRef.current[taskId];
      updateTask(taskId, {
        status: 'error',
        error: fallbackErr?.message || err?.message || 'تعذر الحصول على تصريح رفع الفيديو',
      });
      toast.error(fallbackErr?.message || err?.message || 'تعذر الحصول على تصريح رفع الفيديو');
    }
  }
}
