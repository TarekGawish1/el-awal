'use client';

import { useState, useRef, useEffect } from 'react';
import { useCreateCourse } from './useCourses';
import { coursesApi } from '../api/courses.api';
import { useVideoUploadManager } from '../context/video-upload-manager.context';
import { validateVideoFile } from '../utils/video-optimizer';
import toast from 'react-hot-toast';

interface UseCreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (courseId: string) => void;
}

export function useCreateCourseModal({ isOpen, onClose, onSuccess }: UseCreateCourseModalProps) {
  const createMutation = useCreateCourse();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('اللغة العربية');
  const [gradeLevel, setGradeLevel] = useState('الصف الثالث الثانوي');
  const [academicStage, setAcademicStage] = useState('المرحلة الثانوية');
  const [isFreeCourse, setIsFreeCourse] = useState(false);
  const [price, setPrice] = useState('200');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [courseQuizId, setCourseQuizId] = useState('');
  const [hasCertificate, setHasCertificate] = useState(true);

  const isSubmittedRef = useRef(false);
  const coverImageKeyRef = useRef<string | null>(null);
  const coverImageUrlRef = useRef<string | null>(null);

  const { startUpload, cancelUpload, tasks } = useVideoUploadManager();
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const activeVideoTask = previewTaskId ? tasks[previewTaskId] : undefined;

  const newlyUploadedBunnyVideoIdRef = useRef<string | null>(null);
  const newlyUploadedPreviewUrlRef = useRef<string | null>(null);
  const previewUploadTaskIdRef = useRef<string | null>(null);

  const isUploadingVideo =
    activeVideoTask?.status === 'uploading' ||
    activeVideoTask?.status === 'inspecting' ||
    activeVideoTask?.status === 'processing';

  // Sync completed video to preview
  useEffect(() => {
    if (!activeVideoTask) return;
    if (activeVideoTask.status === 'completed' && activeVideoTask.embedUrl) {
      setPreviewVideoUrl(activeVideoTask.embedUrl);
      newlyUploadedPreviewUrlRef.current = activeVideoTask.embedUrl;
      if (activeVideoTask.videoId) {
        newlyUploadedBunnyVideoIdRef.current = activeVideoTask.videoId;
      }
    }
  }, [activeVideoTask]);

  useEffect(() => {
    coverImageKeyRef.current = coverImageKey;
    coverImageUrlRef.current = coverImageUrl;
  }, [coverImageKey, coverImageUrl]);

  // Clean up uploaded image/video if modal is unmounted without submitting
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        if (coverImageKeyRef.current || coverImageUrlRef.current) {
          coursesApi.deleteUploadedFile(coverImageKeyRef.current || coverImageUrlRef.current);
        }
        if (previewUploadTaskIdRef.current) {
          cancelUpload(previewUploadTaskIdRef.current);
        }
        if (newlyUploadedBunnyVideoIdRef.current) {
          coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        } else if (newlyUploadedPreviewUrlRef.current) {
          coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        }
      }
    };
  }, [cancelUpload]);

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)');
      e.target.value = '';
      return;
    }

    if (newlyUploadedBunnyVideoIdRef.current) {
      coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
      newlyUploadedBunnyVideoIdRef.current = null;
    }

    try {
      const taskId = await startUpload({
        file,
        isCoursePreview: true,
        lessonTitle: `برومو كورس: ${title.trim() || 'كورس جديد'}`,
        onSuccess: (res) => {
          setPreviewVideoUrl(res.embedUrl);
          newlyUploadedPreviewUrlRef.current = res.embedUrl;
          newlyUploadedBunnyVideoIdRef.current = res.videoId;
        },
      });
      setPreviewTaskId(taskId);
      previewUploadTaskIdRef.current = taskId;
    } catch (err) {
      console.error('Failed to start preview video upload:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleCancelVideoUpload = () => {
    if (previewUploadTaskIdRef.current) {
      cancelUpload(previewUploadTaskIdRef.current);
    }
    setPreviewTaskId(null);
    previewUploadTaskIdRef.current = null;
  };

  const handleRemovePreviewVideo = () => {
    if (newlyUploadedBunnyVideoIdRef.current) {
      coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
      newlyUploadedBunnyVideoIdRef.current = null;
    } else if (newlyUploadedPreviewUrlRef.current) {
      coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
      newlyUploadedPreviewUrlRef.current = null;
    }
    setPreviewVideoUrl('');
    toast.success('تمت إزالة الفيديو التعريفي');
  };

  const handleCancel = () => {
    if (!isSubmittedRef.current) {
      if (coverImageKey || coverImageUrl) {
        coursesApi.deleteUploadedFile(coverImageKey || coverImageUrl);
        setCoverImageUrl(null);
        setCoverImageKey(null);
      }
      if (previewUploadTaskIdRef.current) {
        cancelUpload(previewUploadTaskIdRef.current);
      }
      if (newlyUploadedBunnyVideoIdRef.current) {
        coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        newlyUploadedBunnyVideoIdRef.current = null;
      } else if (newlyUploadedPreviewUrlRef.current) {
        coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        newlyUploadedPreviewUrlRef.current = null;
      }
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الكورس');
      return;
    }
    if (isUploadingVideo) {
      toast.error('يرجى الانتظار حتى اكتمال رفع الفيديو التعريفي لحفظه مع الكورس الجديد');
      return;
    }

    try {
      isSubmittedRef.current = true;
      const finalPrice = isFreeCourse ? 0 : (parseFloat(price) || 0);
      let promoToSave = previewVideoUrl.trim() || undefined;
      if (promoToSave) {
        const m =
          promoToSave.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i) ||
          (newlyUploadedBunnyVideoIdRef.current ? [null, newlyUploadedBunnyVideoIdRef.current] : null);
        if (m?.[1] && (promoToSave.includes('mediadelivery.net') || promoToSave.includes('bunnycdn.com') || promoToSave.startsWith('bunny:'))) {
          promoToSave = `bunny:${m[1]}`;
        } else if (newlyUploadedBunnyVideoIdRef.current) {
          promoToSave = `bunny:${newlyUploadedBunnyVideoIdRef.current}`;
        }
      }
      const newCourse = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        gradeLevel,
        academicStage,
        price: finalPrice,
        coverImageUrl: coverImageUrl || undefined,
        previewVideoUrl: promoToSave,
        courseQuizId: courseQuizId || undefined,
        hasCertificate,
      });

      onClose();
      if (onSuccess && newCourse?.id) {
        onSuccess(newCourse.id);
      }
    } catch {
      isSubmittedRef.current = false;
      // Handled by mutation
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    subject,
    setSubject,
    gradeLevel,
    setGradeLevel,
    academicStage,
    setAcademicStage,
    isFreeCourse,
    setIsFreeCourse,
    price,
    setPrice,
    coverImageUrl,
    setCoverImageUrl,
    coverImageKey,
    setCoverImageKey,
    previewVideoUrl,
    setPreviewVideoUrl,
    courseQuizId,
    setCourseQuizId,
    hasCertificate,
    setHasCertificate,
    activeVideoTask,
    isUploadingVideo,
    isPending: createMutation.isPending,
    handleDirectVideoUpload,
    handleCancelVideoUpload,
    handleRemovePreviewVideo,
    handleCancel,
    handleSubmit,
  };
}
