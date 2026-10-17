'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ContentType } from '../types/content.types';
import { useUploadContent, useGroupSessions } from './use-content';
import { useSessionTopics, useTeacherSessions } from '@/features/schedules/hooks/useSchedules';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import {
  ALL_GRADE_LEVELS,
  STAGE_GRADES_MAP,
  getStageFromGrade,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
} from '../constants/contentConstants';
import toast from 'react-hot-toast';

export const uploadSchema = z.object({
  title: z.string().min(3, 'عنوان الملف مطلوب (3 أحرف على الأقل)'),
  description: z.string().optional(),
  contentType: z.nativeEnum(ContentType),
  gradeLevel: z.string().optional(),
  targetScope: z.enum(['ALL_GRADE_GROUPS', 'SPECIFIC_GROUP', 'GENERAL']),
  groupId: z.string().optional(),
  sessionTopic: z.string().optional(),
  sessionId: z.string().optional(),
});

export type UploadFormData = z.infer<typeof uploadSchema>;

interface UseUploadModalStateProps {
  isOpen: boolean;
  onClose: () => void;
  initialGradeLevel?: string;
  initialGroupId?: string;
  initialSessionTopic?: string;
  initialSessionId?: string;
}

export function useUploadModalState({
  isOpen,
  onClose,
  initialGradeLevel,
  initialGroupId,
  initialSessionTopic,
  initialSessionId,
}: UseUploadModalStateProps) {
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groupsData } = useGroups();
  const groups = groupsData || [];
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

  const {
    mutate: uploadContent,
    isPending,
    uploadProgress,
    loadedBytes,
    totalBytes,
    stage: uploadStage,
    resetProgress,
  } = useUploadContent();

  const [selectedStage, setSelectedStage] = useState<string>(() => {
    return getStageFromGrade(initialGradeLevel) || '';
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      contentType: ContentType.FILE,
      gradeLevel: initialGradeLevel || '',
      targetScope: initialGroupId
        ? 'SPECIFIC_GROUP'
        : initialGradeLevel
        ? 'ALL_GRADE_GROUPS'
        : 'ALL_GRADE_GROUPS',
      groupId: initialGroupId || '',
      sessionTopic: initialSessionTopic || '',
      sessionId: initialSessionId || '',
    },
  });

  const selectedTargetScope = watch('targetScope');
  const selectedGradeLevel = watch('gradeLevel');
  const selectedGroupId = watch('groupId');
  const selectedSessionId = watch('sessionId');
  const sessionTopicValue = watch('sessionTopic');

  const availableGrades = useMemo(() => {
    if (!selectedStage) return ALL_GRADE_LEVELS;
    const stageGrades = STAGE_GRADES_MAP[selectedStage] || [];
    return ALL_GRADE_LEVELS.filter((g) => stageGrades.includes(g.value));
  }, [selectedStage]);

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStage = e.target.value;
    setSelectedStage(newStage);

    if (newStage) {
      const validGrades = STAGE_GRADES_MAP[newStage] || [];
      if (selectedGradeLevel && !validGrades.includes(selectedGradeLevel)) {
        setValue('gradeLevel', '');
        setValue('groupId', '');
        setValue('sessionId', '');
        setValue('sessionTopic', '');
      }
    }
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value;
    setValue('gradeLevel', newGrade);
    setValue('groupId', '');
    setValue('sessionId', '');
    setValue('sessionTopic', '');
    if (newGrade) {
      const matchedStage = getStageFromGrade(newGrade);
      if (matchedStage && matchedStage !== selectedStage) {
        setSelectedStage(matchedStage);
      }
    }
  };

  const effectiveGroupId =
    selectedTargetScope === 'SPECIFIC_GROUP' ? selectedGroupId : undefined;

  const { data: selectedGroupSessions = [], isLoading: isLoadingGroupSessions } =
    useGroupSessions(effectiveGroupId);
  const { data: gradeSessions = [], isLoading: isLoadingGradeSessions } = useTeacherSessions({
    gradeLevel: selectedGradeLevel,
    academicYear: activeYear,
    academicTerm: activeTerm,
    timeframe: 'ALL',
  });
  const { data: dbTopics = [] } = useSessionTopics(
    selectedGradeLevel,
    selectedTargetScope === 'SPECIFIC_GROUP' ? selectedGroupId : undefined,
  );
  const rawSessions =
    selectedTargetScope === 'SPECIFIC_GROUP' ? selectedGroupSessions : gradeSessions;

  const semesterSessions = useMemo(() => {
    if (!Array.isArray(rawSessions)) return [];
    return rawSessions.filter((sess: any) => {
      if (activeYear && sess.academicYear && sess.academicYear !== activeYear) return false;
      if (activeTerm && sess.academicTerm && sess.academicTerm !== activeTerm) return false;
      return true;
    });
  }, [rawSessions, activeYear, activeTerm]);

  const isLoadingSessions =
    selectedTargetScope === 'SPECIFIC_GROUP' ? isLoadingGroupSessions : isLoadingGradeSessions;

  const fileCategory = useMemo<'image' | 'video' | 'audio' | 'pdf' | 'other'>(() => {
    if (!file) return 'other';
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|webp|gif)$/)) return 'image';
    if (type.startsWith('video/') || name.match(/\.(mp4|webm|mov|mkv)$/)) return 'video';
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a)$/)) return 'audio';
    if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    return 'other';
  }, [file]);

  useEffect(() => {
    if (file && fileCategory === 'image') {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setFilePreviewUrl(null);
    }
  }, [file, fileCategory]);

  const handleLessonSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setValue('sessionId', '');
      setValue('sessionTopic', '');
      return;
    }

    if (val === '__CUSTOM__') {
      setValue('sessionId', '');
      return;
    }

    if (val.startsWith('SESSION_')) {
      const sId = val.replace('SESSION_', '');
      const sess = semesterSessions.find((s) => s.id === sId);
      setValue('sessionId', sId);
      setValue('sessionTopic', sess?.topic || 'حصة مجدولة');
      return;
    }

    if (val.startsWith('TOPIC_')) {
      const t = val.replace('TOPIC_', '');
      setValue('sessionId', '');
      setValue('sessionTopic', t);
      return;
    }

    setValue('sessionId', '');
    setValue('sessionTopic', val);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialGradeLevel) {
        setValue('gradeLevel', initialGradeLevel);
        setSelectedStage(getStageFromGrade(initialGradeLevel));
      }
      if (initialGroupId) {
        setValue('groupId', initialGroupId);
        setValue('targetScope', 'SPECIFIC_GROUP');
      }
      if (initialSessionTopic) setValue('sessionTopic', initialSessionTopic);
      if (initialSessionId) setValue('sessionId', initialSessionId);
    }
  }, [isOpen, initialGradeLevel, initialGroupId, initialSessionTopic, initialSessionId, setValue]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (activeYear && g.academicYear && g.academicYear !== activeYear) return false;
      if (activeTerm && g.academicTerm && g.academicTerm !== activeTerm) return false;
      if (selectedStage) {
        const gStage = getStageFromGrade(g.gradeLevel);
        if (gStage && gStage !== selectedStage) return false;
      }
      if (selectedGradeLevel && g.gradeLevel !== selectedGradeLevel) return false;
      return true;
    });
  }, [groups, selectedStage, selectedGradeLevel, activeYear, activeTerm]);

  const handleClose = () => {
    if (isPending) return;
    setFile(null);
    setFilePreviewUrl(null);
    setFileError(null);
    resetProgress();
    reset();
    onClose();
  };

  const validateFile = (selectedFile: File): boolean => {
    setFileError(null);

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد الأقصى (100MB)');
      return false;
    }

    if (
      !selectedFile.type &&
      !selectedFile.name.match(/\.(pdf|jpg|jpeg|png|webp|gif|mp3|wav|mp4|webm|mov|doc|docx)$/i)
    ) {
      setFileError('نوع الملف غير مدعوم');
      return false;
    } else if (selectedFile.type && !ALLOWED_TYPES.includes(selectedFile.type)) {
      setFileError(
        `نوع الملف غير مدعوم. الأنواع المسموحة: PDF, صور, مقاطع فيديو, ملفات صوتية, ومستندات Word`,
      );
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        const currentTitle = watch('title');
        if (!currentTitle) {
          setValue('title', selectedFile.name.replace(/\.[^/.]+$/, ''));
        }

        if (selectedFile.type.startsWith('video/')) {
          setValue('contentType', ContentType.LECTURE_RECORDING);
        }
      } else {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const onSubmit = (data: UploadFormData) => {
    if (!file) {
      setFileError('يجب اختيار ملف للرفع');
      return;
    }

    const payloadGroupId = data.targetScope === 'SPECIFIC_GROUP' ? data.groupId : undefined;
    const payloadGradeLevel = data.targetScope !== 'GENERAL' ? data.gradeLevel : undefined;

    uploadContent(
      {
        file,
        metadata: {
          title: data.title,
          description: data.description,
          contentType: data.contentType,
          academicYear: activeYear || '2026-2027',
          academicTerm: activeTerm || 'FIRST_TERM',
          gradeLevel: payloadGradeLevel || undefined,
          groupId: payloadGroupId || undefined,
          sessionTopic: data.sessionTopic || undefined,
          sessionId: data.sessionId || undefined,
          originalFileName: file.name,
        },
      },
      {
        onSuccess: () => {
          toast.success('تم رفع وحفظ المرفق بنجاح');
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء الرفع');
        },
      },
    );
  };

  return {
    file,
    setFile,
    filePreviewUrl,
    fileCategory,
    fileError,
    fileInputRef,
    isPending,
    uploadProgress,
    loadedBytes,
    totalBytes,
    uploadStage,
    selectedStage,
    availableGrades,
    selectedTargetScope,
    selectedGradeLevel,
    filteredGroups,
    semesterSessions,
    dbTopics,
    selectedSessionId,
    sessionTopicValue,
    isLoadingSessions,
    activeYear,
    activeTerm,
    register,
    handleSubmit,
    errors,
    handleStageChange,
    handleGradeChange,
    handleLessonSelectChange,
    handleFileChange,
    handleClose,
    onSubmit,
  };
}
