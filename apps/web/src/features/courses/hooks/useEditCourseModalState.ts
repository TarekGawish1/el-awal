'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateCourse } from './useCourses';
import { coursesApi } from '../api/courses.api';
import { CourseDetail } from '../types/courses.types';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { useVideoUploadManager } from '../context/video-upload-manager.context';
import { validateVideoFile } from '../utils/video-optimizer';
import toast from 'react-hot-toast';

export const STAGE_GRADES: Record<string, string[]> = {
  'المرحلة الثانوية': ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
  'المرحلة الإعدادية': ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  'المرحلة الابتدائية': ['الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'],
};

export const COMMON_SUBJECTS = [
  'الرياضيات',
  'اللغة العربية',
  'اللغة الإنجليزية',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'الجيولوجيا',
  'التاريخ',
  'الجغرافيا',
  'الفلسفة والمنطق',
  'علم النفس والاجتماع',
  'الفرنساوي',
  'الألماني',
  'دراسات اجتماعية',
  'علوم',
];

interface UseEditCourseModalStateProps {
  isOpen: boolean;
  course: CourseDetail;
  onClose: () => void;
  onSuccess?: () => void;
}

export function useEditCourseModalState({
  isOpen,
  course,
  onClose,
  onSuccess,
}: UseEditCourseModalStateProps) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateCourse(course.id);
  const { data: assessmentsData } = useAssessments(undefined, { enabled: isOpen });
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData?.data || []);

  const { startUpload, cancelUpload, getTaskForCoursePreview } = useVideoUploadManager();
  const backgroundUploadTask = getTaskForCoursePreview(course.id);

  const [title, setTitle] = useState(course.title || '');
  const [description, setDescription] = useState(course.description || '');
  const [subject, setSubject] = useState(course.subject || 'الرياضيات');
  const [academicStage, setAcademicStage] = useState(course.academicStage || 'المرحلة الثانوية');
  const [gradeLevel, setGradeLevel] = useState(course.gradeLevel || 'الصف الأول الثانوي');
  const [academicTerm, setAcademicTerm] = useState(course.academicTerm || 'FIRST_TERM');
  const [academicYear, setAcademicYear] = useState(course.academicYear || '2026-2027');
  const [isFreeCourse, setIsFreeCourse] = useState(Number(course.price) === 0);
  const [price, setPrice] = useState(String(course.price !== undefined ? course.price : 0));
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(course.coverImageUrl || null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(course.previewVideoUrl || '');
  const [courseQuizId, setCourseQuizId] = useState(course.courseQuizId || '');
  const [hasCertificate, setHasCertificate] = useState(course.hasCertificate ?? true);
  const [enforceSequentialLessons, setEnforceSequentialLessons] = useState(
    course.enforceSequentialLessons ?? false,
  );
  const [requireExamPassingToUnlock, setRequireExamPassingToUnlock] = useState(
    course.requireExamPassingToUnlock ?? false,
  );

  const initialCoverUrlRef = useRef<string | null>(course.coverImageUrl || null);
  const initialPreviewVideoUrlRef = useRef<string | null>(course.previewVideoUrl || null);
  const isSubmittedRef = useRef(false);
  const newUploadedKeyRef = useRef<string | null>(null);
  const newlyUploadedBunnyVideoIdRef = useRef<string | null>(null);
  const newlyUploadedPreviewUrlRef = useRef<string | null>(null);
  const previewUploadTaskIdRef = useRef<string | null>(null);

  const isUploadingVideo =
    backgroundUploadTask?.status === 'uploading' ||
    backgroundUploadTask?.status === 'inspecting' ||
    backgroundUploadTask?.status === 'processing';

  // Sync background upload completion to modal preview
  useEffect(() => {
    if (!backgroundUploadTask) return;
    if (backgroundUploadTask.status === 'completed' && backgroundUploadTask.embedUrl) {
      setPreviewVideoUrl(backgroundUploadTask.embedUrl);
      newlyUploadedPreviewUrlRef.current = backgroundUploadTask.embedUrl;
      if (backgroundUploadTask.videoId) {
        newlyUploadedBunnyVideoIdRef.current = backgroundUploadTask.videoId;
      }
    }
  }, [backgroundUploadTask]);

  const prevIsOpenRef = useRef(false);
  const prevCourseIdRef = useRef(course.id);

  useEffect(() => {
    const isOpening = isOpen && (!prevIsOpenRef.current || prevCourseIdRef.current !== course.id);
    prevIsOpenRef.current = isOpen;
    prevCourseIdRef.current = course.id;

    if (isOpening) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setSubject(course.subject || 'الرياضيات');
      setAcademicStage(course.academicStage || 'المرحلة الثانوية');
      setGradeLevel(course.gradeLevel || 'الصف الأول الثانوي');
      setAcademicTerm(course.academicTerm || 'FIRST_TERM');
      setAcademicYear(course.academicYear || '2026-2027');
      const isCourseFree = Number(course.price) === 0;
      setIsFreeCourse(isCourseFree);
      setPrice(String(course.price !== undefined ? course.price : 0));
      setCoverImageUrl(course.coverImageUrl || null);
      setCoverImageKey(null);
      setPreviewVideoUrl(course.previewVideoUrl || '');
      setCourseQuizId(course.courseQuizId || '');
      setHasCertificate(course.hasCertificate ?? true);
      setEnforceSequentialLessons(course.enforceSequentialLessons ?? false);
      setRequireExamPassingToUnlock(course.requireExamPassingToUnlock ?? false);
      initialCoverUrlRef.current = course.coverImageUrl || null;
      initialPreviewVideoUrlRef.current = course.previewVideoUrl || null;
      isSubmittedRef.current = false;
      newUploadedKeyRef.current = null;
      newlyUploadedBunnyVideoIdRef.current = null;
      newlyUploadedPreviewUrlRef.current = null;
      previewUploadTaskIdRef.current = null;
    }
  }, [isOpen, course.id]);

  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        if (newUploadedKeyRef.current) {
          coursesApi.deleteUploadedFile(newUploadedKeyRef.current).catch(() => {});
        }
        if (previewUploadTaskIdRef.current) {
          cancelUpload(previewUploadTaskIdRef.current);
        }
        if (newlyUploadedBunnyVideoIdRef.current) {
          coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        } else if (newlyUploadedPreviewUrlRef.current) {
          coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        }
        if (
          newlyUploadedPreviewUrlRef.current &&
          initialPreviewVideoUrlRef.current !== newlyUploadedPreviewUrlRef.current
        ) {
          coursesApi.updateCourse(course.id, {
            previewVideoUrl: initialPreviewVideoUrlRef.current,
          }).catch(() => {});
        }
      }
    };
  }, [course.id, cancelUpload]);

  const handleStageChange = (newStage: string) => {
    setAcademicStage(newStage);
    const availableGrades = STAGE_GRADES[newStage];
    if (availableGrades && availableGrades.length > 0 && !availableGrades.includes(gradeLevel)) {
      setGradeLevel(availableGrades[0]);
    }
  };

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
        courseId: course.id,
        isCoursePreview: true,
        oldPreviewUrl: initialPreviewVideoUrlRef.current || undefined,
        lessonTitle: `برومو كورس: ${title.trim() || course.title}`,
        onSuccess: (res) => {
          setPreviewVideoUrl(res.embedUrl);
          newlyUploadedPreviewUrlRef.current = res.embedUrl;
          newlyUploadedBunnyVideoIdRef.current = res.videoId;
        },
      });
      previewUploadTaskIdRef.current = taskId;
    } catch (err) {
      console.error('Failed to start preview video upload:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleCancelVideoUpload = () => {
    const taskId = previewUploadTaskIdRef.current || backgroundUploadTask?.id || `preview-${course.id}`;
    if (taskId) {
      cancelUpload(taskId);
    }
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
      if (newUploadedKeyRef.current) {
        coursesApi.deleteUploadedFile(newUploadedKeyRef.current).catch(() => {});
      }
      const taskId = previewUploadTaskIdRef.current || (isUploadingVideo ? backgroundUploadTask?.id : null);
      if (isUploadingVideo && taskId) {
        cancelUpload(taskId);
      }
      if (newlyUploadedBunnyVideoIdRef.current) {
        coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        newlyUploadedBunnyVideoIdRef.current = null;
      } else if (newlyUploadedPreviewUrlRef.current) {
        coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        newlyUploadedPreviewUrlRef.current = null;
      }
      if (previewVideoUrl && previewVideoUrl !== initialPreviewVideoUrlRef.current) {
        coursesApi.updateCourse(course.id, {
          previewVideoUrl: initialPreviewVideoUrlRef.current,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['course-details', course.id] });
          queryClient.invalidateQueries({ queryKey: ['courses'] });
        }).catch(() => {});
      }
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال اسم الكورس');
      return;
    }

    try {
      isSubmittedRef.current = true;
      const finalPrice = isFreeCourse ? 0 : (parseFloat(price) || 0);

      const payload: Parameters<typeof updateMutation.mutateAsync>[0] = {
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subject.trim(),
        gradeLevel: gradeLevel.trim(),
        academicStage: academicStage.trim(),
        academicTerm,
        academicYear: academicYear.trim(),
        price: finalPrice,
        coverImageUrl: coverImageUrl || undefined,
        courseQuizId: courseQuizId || null,
        hasCertificate,
        enforceSequentialLessons,
        requireExamPassingToUnlock,
      };

      if (!isUploadingVideo) {
        let promoToSave: string | null = previewVideoUrl.trim() || null;
        if (promoToSave) {
          const m =
            promoToSave.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i) ||
            (newlyUploadedBunnyVideoIdRef.current ? [null, newlyUploadedBunnyVideoIdRef.current] : null);
          if (m?.[1] && (promoToSave.includes('mediadelivery.net') || promoToSave.includes('bunnycdn.com') || promoToSave.startsWith('bunny:'))) {
            promoToSave = `bunny:${m[1]}`;
          }
        }
        (payload as any).previewVideoUrl = promoToSave;
      }

      await updateMutation.mutateAsync(payload);

      if (
        initialCoverUrlRef.current &&
        coverImageUrl &&
        initialCoverUrlRef.current !== coverImageUrl
      ) {
        coursesApi.deleteUploadedFile(initialCoverUrlRef.current).catch(() => {});
      }

      if (
        initialPreviewVideoUrlRef.current &&
        previewVideoUrl !== initialPreviewVideoUrlRef.current &&
        !isUploadingVideo
      ) {
        coursesApi.deleteUploadedFile(initialPreviewVideoUrlRef.current).catch(() => {});
      }

      if (isUploadingVideo) {
        toast.success('تم حفظ التغييرات، ويستمر رفع الفيديو في الخلفية بأمان 🚀', {
          duration: 5000,
        });
      } else {
        toast.success('تم تحديث بيانات الكورس بنجاح');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      isSubmittedRef.current = false;
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    subject,
    setSubject,
    academicStage,
    gradeLevel,
    setGradeLevel,
    academicTerm,
    setAcademicTerm,
    academicYear,
    setAcademicYear,
    isFreeCourse,
    setIsFreeCourse,
    price,
    setPrice,
    coverImageUrl,
    setCoverImageUrl,
    coverImageKey,
    setCoverImageKey,
    previewVideoUrl,
    courseQuizId,
    setCourseQuizId,
    hasCertificate,
    setHasCertificate,
    enforceSequentialLessons,
    setEnforceSequentialLessons,
    isUploadingVideo,
    backgroundUploadTask,
    assessments,
    newUploadedKeyRef,
    isPending: updateMutation.isPending,
    handleStageChange,
    handleDirectVideoUpload,
    handleCancelVideoUpload,
    handleRemovePreviewVideo,
    handleCancel,
    handleSubmit,
  };
}
