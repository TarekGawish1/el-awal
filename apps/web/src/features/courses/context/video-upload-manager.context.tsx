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

export interface VideoUploadTask {
  id: string;
  lessonId?: string;
  courseId?: string;
  moduleId?: string;
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
  dismissTask: (taskId: string) => void;
  getTaskForLesson: (lessonId?: string) => VideoUploadTask | undefined;
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
  const tasksRef = useRef<Record<string, VideoUploadTask>>({});
  tasksRef.current = tasks;

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
      const xhr = activeXhrsRef.current[taskId];
      if (xhr) {
        xhr.abort();
        delete activeXhrsRef.current[taskId];
      }

      const task = tasksRef.current[taskId];
      if (task?.videoId) {
        coursesApi.deleteUploadedFile(`bunny:${task.videoId}`);
      }

      updateTask(taskId, {
        status: 'aborted',
        error: 'تم إلغاء رفع الفيديو بواسطة المستخدم',
      });
      toast.error(`تم إلغاء رفع فيديو "${task?.lessonTitle || ''}"`);
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
    (lessonId?: string) => {
      if (!lessonId) return undefined;
      const allTasks = Object.values(tasksRef.current);
      return allTasks.find(
        (t) =>
          t.lessonId === lessonId &&
          (t.status === 'uploading' ||
            t.status === 'inspecting' ||
            t.status === 'processing' ||
            t.status === 'completed'),
      );
    },
    [],
  );

  const startUpload = useCallback(
    async (options: StartUploadOptions): Promise<string> => {
      const { file, lessonId, courseId, moduleId, lessonTitle, onSuccess } =
        options;

      const validation = validateVideoFile(file);
      if (!validation.isValid) {
        const errMsg =
          validation.error ||
          'حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)';
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      const taskId =
        lessonId || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const initialTask: VideoUploadTask = {
        id: taskId,
        lessonId,
        courseId,
        moduleId,
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

          const xhr = new XMLHttpRequest();
          activeXhrsRef.current[taskId] = xhr;
          xhr.open('PUT', creds.uploadUrl);

          if (creds.provider === 'r2') {
            xhr.setRequestHeader('Content-Type', 'video/mp4');
          } else {
            if (creds.accessKey) xhr.setRequestHeader('AccessKey', creds.accessKey);
            if (creds.authorizationSignature) {
              xhr.setRequestHeader(
                'AuthorizationSignature',
                creds.authorizationSignature,
              );
            }
            if (creds.authorizationExpire) {
              xhr.setRequestHeader(
                'AuthorizationExpire',
                String(creds.authorizationExpire),
              );
            }
            if (creds.libraryId) xhr.setRequestHeader('LibraryId', creds.libraryId);
            if (creds.videoId) xhr.setRequestHeader('VideoId', creds.videoId);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          }

          let lastLoaded = 0;
          let lastTime = Date.now();

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;
              let currentSpeed = 0;
              let eta = 0;

              if (timeDiff >= 0.5) {
                const bytesDiff = event.loaded - lastLoaded;
                currentSpeed = bytesDiff / timeDiff / (1024 * 1024); // MB/s
                const remainingBytes = event.total - event.loaded;
                eta =
                  currentSpeed > 0
                    ? remainingBytes / (1024 * 1024) / currentSpeed
                    : 0;
                lastLoaded = event.loaded;
                lastTime = now;
              }

              const percent = Math.round((event.loaded / event.total) * 80) + 15;

              updateTask(taskId, {
                uploadedBytes: event.loaded,
                totalBytes: event.total,
                progress: Math.min(percent, 98),
                speedMbps:
                  currentSpeed > 0
                    ? parseFloat(currentSpeed.toFixed(2))
                    : undefined,
                etaSeconds: eta > 0 ? Math.ceil(eta) : undefined,
              });
            }
          };

          xhr.onload = async () => {
            delete activeXhrsRef.current[taskId];
            if (xhr.status >= 200 && xhr.status < 300) {
              updateTask(taskId, {
                status: 'completed',
                progress: 100,
                videoId: creds.videoId,
                embedUrl: creds.embedUrl,
                durationSeconds: metaDuration,
                completedAt: new Date(),
              });

              // If lessonId is already known, auto-save video details to the lesson in background
              const currentTaskState = tasksRef.current[taskId];
              const targetLessonId = currentTaskState?.lessonId || lessonId;

              if (targetLessonId) {
                try {
                  await coursesApi.updateLesson(targetLessonId, {
                    bunnyVideoId:
                      creds.provider === 'r2'
                        ? `r2:${creds.videoId}`
                        : creds.videoId,
                    contentUrl: creds.embedUrl,
                    videoDurationSeconds: metaDuration,
                  });
                  queryClient.invalidateQueries({ queryKey: ['courses'] });
                } catch (saveErr) {
                  console.warn('Auto background update of lesson failed:', saveErr);
                }
              }

              toast.success(
                `تم اكتمال رفع فيديو "${lessonTitle || file.name}" بنجاح! 🚀`,
                { duration: 6000 },
              );

              if (onSuccess) {
                onSuccess({
                  videoId: creds.videoId,
                  embedUrl: creds.embedUrl,
                  durationSeconds: metaDuration,
                });
              }
            } else {
              updateTask(taskId, {
                status: 'error',
                error: `تعذر رفع الفيديو إلى سيرفر البث السحابي (كود: ${xhr.status})`,
              });
              toast.error(
                `فشل رفع الفيديو "${lessonTitle || file.name}" (كود: ${xhr.status})`,
              );
            }
          };

          xhr.onerror = () => {
            delete activeXhrsRef.current[taskId];
            updateTask(taskId, {
              status: 'error',
              error: 'حدث خطأ في الاتصال أثناء رفع الفيديو',
            });
            toast.error(
              `حدث خطأ في الاتصال أثناء رفع فيديو "${lessonTitle || file.name}"`,
            );
          };

          xhr.send(file);
        } catch (err: any) {
          delete activeXhrsRef.current[taskId];
          updateTask(taskId, {
            status: 'error',
            error: err?.message || 'تعذر الحصول على تصريح رفع الفيديو',
          });
          toast.error(err?.message || 'تعذر الحصول على تصريح رفع الفيديو');
        }
      })();

      return taskId;
    },
    [queryClient, updateTask],
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
        dismissTask,
        getTaskForLesson,
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
  dismissTask: () => {},
  getTaskForLesson: () => undefined,
  attachLessonIdToTask: () => {},
};

export function useVideoUploadManager() {
  const context = useContext(VideoUploadManagerContext);
  return context || defaultContextValue;
}
