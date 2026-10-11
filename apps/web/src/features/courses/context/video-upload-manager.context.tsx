'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from 'react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../api/courses.api';
import {
  extractVideoMetadata,
  validateVideoFile,
  VideoMetadata,
} from '../utils/video-optimizer';
import {
  createBunnyTusUpload,
  BunnyTusUploadInstance,
} from '../utils/bunny-tus-uploader';

export interface VideoUploadTask {
  id: string;
  lessonId?: string;
  courseId?: string;
  moduleId?: string;
  isCoursePreview?: boolean;
  oldPreviewUrl?: string;
  lessonTitle: string;
  fileName: string;
  fileSize: number;
  status:
    | 'idle'
    | 'inspecting'
    | 'uploading'
    | 'processing'
    | 'completed'
    | 'error'
    | 'aborted';
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  speedMbps: number;
  etaSeconds: number;
  videoId?: string;
  embedUrl?: string;
  durationSeconds?: number;
  videoMeta?: VideoMetadata | null;
  error?: string | null;
  provider?: 'bunny' | 'r2';
  completedAt?: Date;
}

export interface StartUploadOptions {
  file: File;
  lessonId?: string;
  courseId?: string;
  moduleId?: string;
  isCoursePreview?: boolean;
  oldPreviewUrl?: string;
  lessonTitle: string;
  onSuccess?: (result: {
    videoId: string;
    embedUrl: string;
    durationSeconds: number;
  }) => void;
}

interface VideoUploadManagerContextType {
  tasks: Record<string, VideoUploadTask>;
  activeTasks: VideoUploadTask[];
  startUpload: (options: StartUploadOptions) => Promise<string>;
  cancelUpload: (taskId: string) => void;
  retryUpload: (taskId: string) => Promise<void>;
  dismissTask: (taskId: string) => void;
  getTaskForLesson: (
    lessonId?: string,
    moduleId?: string,
  ) => VideoUploadTask | undefined;
  getTaskForCoursePreview: (courseId?: string) => VideoUploadTask | undefined;
  attachLessonIdToTask: (taskId: string, lessonId: string) => void;
}

const VideoUploadManagerContext = createContext<
  VideoUploadManagerContextType | undefined
>(undefined);

export function VideoUploadManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<Record<string, VideoUploadTask>>({});
  const activeXhrsRef = useRef<Record<string, XMLHttpRequest>>({});
  const activeTusUploadsRef = useRef<Record<string, BunnyTusUploadInstance>>({});
  const tasksRef = useRef<Record<string, VideoUploadTask>>({});
  tasksRef.current = tasks;
  const taskOptionsRef = useRef<Record<string, StartUploadOptions>>({});

  const queryClient = useQueryClient();

  const updateTask = useCallback(
    (taskId: string, patch: Partial<VideoUploadTask>) => {
      setTasks((prev) => {
        const existing = prev[taskId];
        if (!existing) return prev;
        return {
          ...prev,
          [taskId]: { ...existing, ...patch },
        };
      });
    },
    [],
  );

  const attachLessonIdToTask = useCallback(
    (taskId: string, lessonId: string) => {
      updateTask(taskId, { lessonId });
    },
    [updateTask],
  );

  const cancelUpload = useCallback(
    (taskId: string) => {
      const tusUpload = activeTusUploadsRef.current[taskId];
      const xhr = activeXhrsRef.current[taskId];
      const task = tasksRef.current[taskId];

      // If there is no active TUS upload, no active XHR and no tracked task (or already finished/aborted), ignore
      if (!tusUpload && !xhr && (!task || task.status === 'aborted' || task.status === 'completed')) {
        return;
      }

      if (tusUpload) {
        tusUpload.abort();
        delete activeTusUploadsRef.current[taskId];
      }

      if (xhr) {
        xhr.abort();
        delete activeXhrsRef.current[taskId];
      }

      if (task?.videoId) {
        coursesApi.deleteUploadedFile(`bunny:${task.videoId}`).catch(() => {});
      }

      updateTask(taskId, {
        status: 'aborted',
        error: 'تم إلغاء رفع الفيديو بواسطة المستخدم',
      });
      if (task?.lessonTitle) {
        toast.error(`تم إلغاء رفع فيديو "${task.lessonTitle}"`);
      } else {
        toast.error('تم إلغاء رفع الفيديو');
      }
    },
    [updateTask],
  );

  const dismissTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const getTaskForLesson = useCallback(
    (lessonId?: string, moduleId?: string) => {
      const allTasks = Object.values(tasks);
      if (lessonId) {
        const direct = allTasks.find(
          (t) =>
            (t.lessonId === lessonId || t.id === lessonId) &&
            (t.status === 'uploading' ||
              t.status === 'inspecting' ||
              t.status === 'processing' ||
              t.status === 'completed'),
        );
        if (direct) return direct;
      }
      if (moduleId) {
        const byMod = allTasks.find(
          (t) =>
            t.moduleId === moduleId &&
            (t.status === 'uploading' ||
              t.status === 'inspecting' ||
              t.status === 'processing' ||
              t.status === 'completed'),
        );
        if (byMod) return byMod;
      }
      if (allTasks.length === 1) {
        const only = allTasks[0];
        if (
          only.status === 'uploading' ||
          only.status === 'inspecting' ||
          only.status === 'processing' ||
          only.status === 'completed'
        ) {
          return only;
        }
      }
      return undefined;
    },
    [tasks],
  );

  const getTaskForCoursePreview = useCallback(
    (courseId?: string) => {
      if (!courseId) return undefined;
      const allTasks = Object.values(tasks);
      return allTasks.find(
        (t) =>
          t.courseId === courseId &&
          t.isCoursePreview &&
          (t.status === 'uploading' ||
            t.status === 'inspecting' ||
            t.status === 'processing' ||
            t.status === 'completed'),
      );
    },
    [tasks],
  );

  const startUpload = useCallback(
    async (options: StartUploadOptions): Promise<string> => {
      const {
        file,
        lessonId,
        courseId,
        moduleId,
        lessonTitle,
        isCoursePreview,
        oldPreviewUrl,
        onSuccess,
      } = options;

      const validation = validateVideoFile(file);
      if (!validation.isValid) {
        const errMsg =
          validation.error ||
          'حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)';
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      const taskId =
        lessonId ||
        (isCoursePreview && courseId ? `preview-${courseId}` : undefined) ||
        `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      taskOptionsRef.current[taskId] = options;

      const initialTask: VideoUploadTask = {
        id: taskId,
        lessonId,
        courseId,
        moduleId,
        isCoursePreview,
        oldPreviewUrl,
        lessonTitle: lessonTitle || file.name,
        fileName: file.name,
        fileSize: file.size,
        status: 'inspecting',
        progress: 5,
        uploadedBytes: 0,
        totalBytes: file.size,
        speedMbps: 0,
        etaSeconds: 0,
      };

      setTasks((prev) => ({ ...prev, [taskId]: initialTask }));

      (async () => {
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
          // Only persist bunnyVideoId - never the signed embedUrl (expires in ~2h -> 404).
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
      })();

      return taskId;
    },
    [queryClient, updateTask],
  );

  const retryUpload = useCallback(
    async (taskId: string) => {
      const options = taskOptionsRef.current[taskId];
      if (!options) return;
      delete tasksRef.current[taskId];
      setTasks((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      await startUpload(options);
    },
    [startUpload],
  );

  const activeTasks = Object.values(tasks).filter(
    (t) =>
      t.status === 'uploading' ||
      t.status === 'inspecting' ||
      t.status === 'processing' ||
      t.status === 'completed' ||
      t.status === 'error',
  );

  return (
    <VideoUploadManagerContext.Provider
      value={{
        tasks,
        activeTasks,
        startUpload,
        cancelUpload,
        retryUpload,
        dismissTask,
        getTaskForLesson,
        getTaskForCoursePreview,
        attachLessonIdToTask,
      }}
    >
      {children}
    </VideoUploadManagerContext.Provider>
  );
}

const defaultContextValue: VideoUploadManagerContextType = {
  tasks: {},
  activeTasks: [],
  startUpload: async () => '',
  cancelUpload: () => {},
  retryUpload: async () => {},
  dismissTask: () => {},
  getTaskForLesson: () => undefined,
  getTaskForCoursePreview: () => undefined,
  attachLessonIdToTask: () => {},
};

export function useVideoUploadManager() {
  const context = useContext(VideoUploadManagerContext);
  return context || defaultContextValue;
}
