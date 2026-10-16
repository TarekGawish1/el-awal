import { CourseLesson, LessonAttachment } from '../types/courses.types';
import { VideoMetadata } from '../utils/video-optimizer';

export type LessonEditorTabType = 'video' | 'summary' | 'attachments' | 'quiz';

export interface LessonEditorModalProps {
  isOpen: boolean;
  courseId: string;
  moduleId: string;
  lesson?: CourseLesson | null;
  initialTab?: LessonEditorTabType;
  newAssessmentId?: string;
  newAssessmentType?: string;
  newAssessmentTitle?: string;
  onClose: () => void;
}

export interface UseLessonEditorReturn {
  // Navigation & General
  activeTab: LessonEditorTabType;
  setActiveTab: (tab: LessonEditorTabType) => void;
  isEditing: boolean;
  isEditingEffective: boolean;
  resolvedLessonId: string | null;
  isSavingAndRedirecting: boolean;
  isSaving: boolean;

  // Form Fields
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  lessonType: string;
  setLessonType: (val: string) => void;
  videoDurationSeconds: number;
  setVideoDurationSeconds: (val: number) => void;
  isFreePreview: boolean;
  setIsFreePreview: (val: boolean) => void;

  // Video State & Actions
  bunnyVideoId: string;
  videoEmbedUrl: string;
  uploadedVideoName: string;
  isUploadingVideo: boolean;
  isInspectingVideo: boolean;
  videoUploadProgress: number;
  uploadSpeedMbps: number;
  uploadedBytes: number;
  totalBytes: number;
  etaSeconds: number;
  videoMeta: VideoMetadata | null;
  streamAuth: any;
  backgroundUploadTask: any;
  handleDirectVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCancelUpload: () => void;
  handleRemoveVideo: () => Promise<void>;

  // Attachments State & Actions
  attachments: LessonAttachment[];
  isAddingAttachment: boolean;
  setIsAddingAttachment: (val: boolean) => void;
  newAttachmentTitle: string;
  setNewAttachmentTitle: (val: string) => void;
  newAttachmentUrl: string;
  setNewAttachmentUrl: (val: string) => void;
  newAttachmentKey: string;
  setNewAttachmentKey: (val: string) => void;
  newAttachmentSize?: number;
  setNewAttachmentSize: (val?: number) => void;
  newAttachmentType: string;
  setNewAttachmentType: (val: string) => void;
  handleAddAttachment: () => Promise<void>;
  handleDeleteAttachment: (att: LessonAttachment) => Promise<void>;
  isAddingAttachmentLoading: boolean;

  // Assessments (Quiz & Homework) State & Actions
  lessonQuizId: string;
  setLessonQuizId: (id: string) => void;
  lessonHomeworkId: string;
  setLessonHomeworkId: (id: string) => void;
  allowMultipleAttempts: boolean;
  setAllowMultipleAttempts: (val: boolean) => void;
  allowHomeworkMultipleAttempts: boolean;
  setAllowHomeworkMultipleAttempts: (val: boolean) => void;
  isQuizOptional: boolean;
  setIsQuizOptional: (val: boolean) => void;
  isHomeworkOptional: boolean;
  setIsHomeworkOptional: (val: boolean) => void;
  isQuizPassRequired: boolean;
  setIsQuizPassRequired: (val: boolean) => void;
  isHomeworkPassRequired: boolean;
  setIsHomeworkPassRequired: (val: boolean) => void;
  examOptions: any[];
  homeworkOptions: any[];
  handleSaveAndCreateAssessment: (type: 'EXAM' | 'ASSIGNMENT') => Promise<void>;

  // Save & Cancel
  handleSaveLesson: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
}
