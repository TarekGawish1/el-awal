'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ContentType, EducationalContent } from '../types/content.types';
import { useUpdateContent, useGroupSessions } from './use-content';
import { useSessionTopics } from '@/features/schedules/hooks/useSchedules';
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

export const editSchema = z.object({
  title: z.string().min(3, 'عنوان الملف مطلوب (3 أحرف على الأقل)'),
  description: z.string().optional(),
  contentType: z.nativeEnum(ContentType),
  gradeLevel: z.string().optional(),
  targetScope: z.enum(['ALL_GRADE_GROUPS', 'SPECIFIC_GROUP', 'GENERAL']),
  groupId: z.string().optional(),
  sessionTopic: z.string().optional(),
  sessionId: z.string().optional(),
  academicYear: z.string().optional(),
  academicTerm: z.string().optional(),
});

export type EditFormData = z.infer<typeof editSchema>;

interface UseEditContentModalStateProps {
  isOpen: boolean;
  content: EducationalContent | null;
  onClose: () => void;
}

export function useEditContentModalState({
  isOpen,
  content,
  onClose,
}: UseEditContentModalStateProps) {
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementPreviewUrl, setReplacementPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groupsData } = useGroups();
  const groups = groupsData || [];
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

  const {
    mutateAsync: updateContentMutate,
    isPending,
    uploadProgress,
    loadedBytes,
    totalBytes,
    stage: uploadStage,
    resetProgress,
  } = useUpdateContent();

  const [selectedStage, setSelectedStage] = useState<string>(() => {
    return getStageFromGrade(content?.gradeLevel) || '';
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
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
    selectedTargetScope === 'SPECIFIC_GROUP'
      ? selectedGroupId
      : groups.find((g) => g.gradeLevel === selectedGradeLevel)?.id;

  const { data: groupSessions = [], isLoading: isLoadingSessions } =
    useGroupSessions(effectiveGroupId);
  const { data: dbTopics = [] } = useSessionTopics(selectedGradeLevel, effectiveGroupId);

  const rawSessions = groupSessions;

  const semesterSessions = useMemo(() => {
    if (!Array.isArray(rawSessions)) return [];
    return rawSessions.filter((sess: any) => {
      if (activeYear && sess.academicYear && sess.academicYear !== activeYear) return false;
      if (activeTerm && sess.academicTerm && sess.academicTerm !== activeTerm) return false;
      return true;
    });
  }, [rawSessions, activeYear, activeTerm]);

  const replacementCategory = useMemo<'image' | 'video' | 'audio' | 'pdf' | 'other'>(() => {
    if (!replacementFile) return 'other';
    const type = replacementFile.type.toLowerCase();
    const name = replacementFile.name.toLowerCase();
    if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|webp|gif)$/)) return 'image';
    if (type.startsWith('video/') || name.match(/\.(mp4|webm|mov|mkv)$/)) return 'video';
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a)$/)) return 'audio';
    if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    return 'other';
  }, [replacementFile]);

  useEffect(() => {
    if (replacementFile && replacementCategory === 'image') {
      const url = URL.createObjectURL(replacementFile);
      setReplacementPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setReplacementPreviewUrl(null);
    }
  }, [replacementFile, replacementCategory]);

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
    if (isOpen && content) {
      const scope = content.groupId
        ? 'SPECIFIC_GROUP'
        : content.gradeLevel
        ? 'ALL_GRADE_GROUPS'
        : 'GENERAL';

      setSelectedStage(getStageFromGrade(content.gradeLevel) || '');

      reset({
        title: content.title || '',
        description: content.description || '',
        contentType: content.contentType || ContentType.FILE,
        gradeLevel: content.gradeLevel || '',
        targetScope: scope,
        groupId: content.groupId || '',
        sessionTopic: content.sessionTopic || '',
        sessionId: content.sessionId || '',
        academicYear: content.academicYear || activeYear,
        academicTerm: content.academicTerm || activeTerm,
      });

      setReplacementFile(null);
      setReplacementPreviewUrl(null);
      setFileError(null);
      setIsReplacingFile(false);
      resetProgress();
    }
  }, [isOpen, content, reset, activeYear, activeTerm, resetProgress]);

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
    setReplacementFile(null);
    setReplacementPreviewUrl(null);
    setFileError(null);
    setIsReplacingFile(false);
    resetProgress();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setFileError('نوع الملف غير مدعوم. يرجى رفع ملفات PDF، صور، مستندات Word، أو فيديو.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت).');
      return;
    }

    setReplacementFile(selectedFile);
  };

  const onSubmit = async (data: EditFormData) => {
    if (!content) return;
    try {
      const finalGroupId = data.targetScope === 'SPECIFIC_GROUP' ? data.groupId : undefined;
      const finalGradeLevel = data.targetScope !== 'GENERAL' ? data.gradeLevel : undefined;

      await updateContentMutate(
        {
          id: content.id,
          metadata: {
            title: data.title,
            description: data.description || undefined,
            contentType: data.contentType,
            gradeLevel: finalGradeLevel || undefined,
            groupId: finalGroupId || undefined,
            sessionTopic: data.sessionTopic || undefined,
            sessionId: data.sessionId && data.sessionId !== '__CUSTOM__' ? data.sessionId : undefined,
            academicYear: data.academicYear || content.academicYear || activeYear,
            academicTerm: data.academicTerm || content.academicTerm || activeTerm,
            originalFileName: replacementFile ? replacementFile.name : undefined,
          },
          file: replacementFile,
        },
        {
          onSuccess: () => {
            toast.success('تم تحديث بيانات المرفق بنجاح');
            handleClose();
          },
          onError: (err: any) => {
            toast.error(err.message || 'حدث خطأ أثناء تحديث المرفق');
          },
        },
      );
    } catch {
      // Error handled by mutation onError
    }
  };

  return {
    replacementFile,
    setReplacementFile,
    replacementPreviewUrl,
    replacementCategory,
    fileError,
    setFileError,
    isReplacingFile,
    setIsReplacingFile,
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
