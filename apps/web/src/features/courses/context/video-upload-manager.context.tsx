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
import { validateVideoFile } from '../utils/video-optimizer';
import type { BunnyTusUploadInstance } from '../utils/bunny-tus-uploader';
import { executeVideoUpload } from './video-upload-executor';
import type {
  VideoUploadTask,
  StartUploadOptions,
  VideoUploadManagerContextType,
} from '../types/video-upload.types';

// Re-export all types and utilities so that existing imports across the codebase remain 100% valid
export * from '../types/video-upload.types';

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
        await executeVideoUpload({
          options,
          taskId,
          updateTask,
          activeXhrsRef,
          activeTusUploadsRef,
          tasksRef,
          queryClient,
        });
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
