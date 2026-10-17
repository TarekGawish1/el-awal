import { VideoMetadata } from '../utils/video-optimizer';

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

export interface VideoUploadManagerContextType {
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

export async function isBraveBrowser(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((navigator as any).brave) {
    if (typeof (navigator as any).brave.isBrave === 'function') {
      try {
        const isBrave = await (navigator as any).brave.isBrave();
        return Boolean(isBrave);
      } catch {
        return true;
      }
    }
    return true;
  }
  return navigator.userAgent.includes('Brave');
}
