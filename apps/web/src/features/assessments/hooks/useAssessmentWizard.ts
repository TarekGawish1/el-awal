'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  generatePresignedUrl,
  uploadFileToR2,
  uploadRawFile,
} from '@/features/content/api/content.api';
import {
  createAssessmentSchema,
  CreateAssessmentFormData,
} from '../types/assessments.schema';
import { QuestionType } from '../types/assessments.types';
import { useCreateAssessment } from './use-assessments';
import { useGroups } from '../../groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '../../groups/hooks/useAcademicPeriod';
import { useTeacherCourses } from '@/features/courses/hooks/useCourses';
import {
  useAssessmentSchedule,
  getNextSessionDate,
  getGroupNextSessionDate,
} from './useAssessmentSchedule';
import { useAssessmentPrefill } from './useAssessmentPrefill';
import { buildAssessmentPayload } from '../utils/assessmentPayloadBuilder';
import toast from 'react-hot-toast';

export type Step = 'metadata' | 'questions' | 'review';

export { getGroupNextSessionDate, getNextSessionDate };

export function useAssessmentWizard({
  type = 'EXAM',
}: {
  type?: 'EXAM' | 'ASSIGNMENT';
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramGroupId = searchParams.get('groupId');
  const paramTopic = searchParams.get('topic');
  const paramDueDate = searchParams.get('dueDate');
  const paramCourseId = searchParams.get('courseId');
  const paramCourseName = searchParams.get('courseName');
  const paramModuleId = searchParams.get('moduleId');
  const paramModuleName = searchParams.get('moduleName');
  const paramLessonId = searchParams.get('lessonId');
  const paramLessonTitle = searchParams.get('lessonTitle');
  const paramScope = searchParams.get('scope');

  const courseLinkScope =
    paramCourseId &&
    (paramScope === 'COURSE' ||
      (paramScope === 'UNIT' && paramModuleId) ||
      (paramScope === 'LESSON' && paramLessonId))
      ? paramScope
      : null;

  const { data: teacherCourses } = useTeacherCourses();

  const [currentStep, setCurrentStep] = useState<Step>('metadata');
  const [targetScope, setTargetScope] = useState<'GROUPS' | 'COURSE'>(
    paramCourseId ? 'COURSE' : 'GROUPS'
  );
  const [dueDateOption, setDueDateOption] = useState<
    'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE'
  >(paramCourseId ? 'NO_DEADLINE' : paramDueDate ? 'CUSTOM' : 'NEXT_SESSION');
  const [homeworkMode, setHomeworkMode] = useState<'INTERACTIVE' | 'BOOKLET'>(
    'BOOKLET'
  );
  const [startPage, setStartPage] = useState<number | ''>('');
  const [endPage, setEndPage] = useState<number | ''>('');
  const [bookletImages, setBookletImages] = useState<string[]>([]);
  const [isUploadingBooklet, setIsUploadingBooklet] = useState(false);

  const { mutate: createAssessment, isPending } = useCreateAssessment();

  const methods = useForm<CreateAssessmentFormData>({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: {
      title: '',
      description: '',
      totalScore: 100,
      passingScore: 50,
      durationMinutes: 60,
      timingType: 'FIXED_SESSION',
      startTime: '',
      endTime: '',
      isAutoGraded: true,
      allowMultipleAttempts: false,
      isOptional: false,
      requirePassingScore: false,
      questions: [
        {
          questionNumber: 1,
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          questionText: '',
          optionsData: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
          correctAnswer: '',
          displayOrder: 0,
        },
      ],
      academicStage: '',
      gradeLevel: '',
      targetGroupIds: [],
      courseId: paramCourseId || null,
    },
    mode: 'onTouched',
  });

  const { control, trigger } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const formDataValues = methods.watch();
  const selectedStage = formDataValues.academicStage;
  const selectedGrade = formDataValues.gradeLevel;

  const schedule = useAssessmentSchedule(methods, formDataValues.timingType);

  const nowIso = new Date().toISOString();
  const { data: allGroups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(allGroups);
  const watchedTargetGroupIds = formDataValues.targetGroupIds;

  useAssessmentPrefill({
    methods,
    paramCourseId,
    courseLinkScope,
    paramLessonTitle,
    paramModuleName,
    paramCourseName,
    paramGroupId,
    paramTopic,
    paramDueDate,
    allGroups,
    activeYear,
    activeTerm,
    teacherCourses,
    type,
    dueDateOption,
    watchedTargetGroupIds,
    setTargetScope,
    setDueDateOption,
  });

  const availableGroups =
    allGroups?.filter(
      (g) =>
        g.gradeLevel === selectedGrade &&
        g.academicYear === activeYear &&
        g.academicTerm === activeTerm
    ) || [];

  const handleBookletImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingBooklet(true);
    try {
      const uploadedUrls: string[] = [...bookletImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`الملف ${file.name} ليس صورة صالحة`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`حجم الصورة ${file.name} يتجاوز 5 ميجابايت`);
          continue;
        }

        try {
          const presigned = await generatePresignedUrl({
            fileName: file.name,
            contentType: file.type || 'image/jpeg',
            fileSizeBytes: file.size,
            folder: 'assessments',
          });

          await uploadFileToR2(
            presigned.uploadUrl,
            file,
            file.type || 'image/jpeg'
          );
          uploadedUrls.push(presigned.publicUrl);
        } catch (directErr) {
          console.warn(
            `Direct R2 upload failed for ${file.name}; falling back to server raw upload:`,
            directErr
          );
          try {
            const rawRes = await uploadRawFile(file, 'assessments');
            uploadedUrls.push(rawRes.fileUrl);
          } catch {
            toast.error(`حدث خطأ أثناء رفع الصورة ${file.name}`);
          }
        }
      }
      setBookletImages(uploadedUrls);
      toast.success('تم رفع الصور بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء رفع بعض الصور');
    } finally {
      setIsUploadingBooklet(false);
      e.target.value = '';
    }
  };

  const nextStep = async (step: Step) => {
    let isValid = false;

    if (currentStep === 'metadata') {
      isValid = await trigger([
        'title',
        'description',
        'totalScore',
        'passingScore',
        'startTime',
        'endTime',
        'startDate',
        'dueDate',
        'durationMinutes',
      ]);
    } else if (currentStep === 'questions') {
      if (type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET') {
        if (!startPage || !endPage) {
          toast.error('يرجى تحديد أرقام صفحات الواجب');
          return;
        }
        if (Number(startPage) > Number(endPage)) {
          toast.error('رقم بداية الصفحة لا يمكن أن يكون أكبر من رقم النهاية');
          return;
        }

        methods.setValue(
          'questions',
          [
            {
              questionNumber: 1,
              questionType: QuestionType.ESSAY,
              points: methods.getValues('totalScore') || 10,
              questionText: `حل صفحات الملزمة من صفحة ${startPage} إلى صفحة ${endPage}`,
              optionsData: bookletImages,
              correctAnswer: 'Booklet submission',
              displayOrder: 1,
            },
          ],
          { shouldValidate: true }
        );

        isValid = true;
      } else {
        isValid = await trigger('questions');
        if (isValid && fields.length === 0) {
          toast.error('يجب إضافة سؤال واحد على الأقل');
          isValid = false;
        } else if (isValid) {
          const currentQuestions = methods.getValues('questions') || [];
          const currentSum = currentQuestions.reduce(
            (sum, q) => sum + (Number(q.points) || 0),
            0
          );
          if (currentSum > 0) {
            methods.setValue('totalScore', currentSum, {
              shouldValidate: true,
              shouldDirty: true,
            });
            const currentPass = Number(methods.getValues('passingScore'));
            if (currentPass > currentSum || currentPass === 50) {
              methods.setValue(
                'passingScore',
                Math.max(0.5, Math.round(currentSum * 0.5)),
                {
                  shouldValidate: true,
                  shouldDirty: true,
                }
              );
            }
          }
        }
      }
    }

    if (isValid) {
      setCurrentStep(step);
    } else {
      toast.error('يرجى تصحيح الأخطاء قبل المتابعة');
    }
  };

  const onSubmit = (data: CreateAssessmentFormData, isPublished: boolean) => {
    const payload = buildAssessmentPayload(
      data,
      isPublished,
      type,
      courseLinkScope,
      paramCourseId,
      paramModuleId,
      paramLessonId
    );

    const label = type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار';
    const courseIdForRedirect =
      (payload.courseId as string | undefined) || paramCourseId || null;

    createAssessment(payload, {
      onSuccess: (res: any) => {
        toast.success(
          isPublished
            ? `تم إنشاء ونشر ${label} بنجاح`
            : `تم حفظ ${label} كمسودة`
        );
        const id = res?.id || res?.data?.id;
        if (paramLessonId && paramCourseId) {
          router.push(
            `/teacher/courses/${paramCourseId}?moduleId=${
              paramModuleId || ''
            }&lessonId=${paramLessonId}&newAssessmentId=${
              id || ''
            }&newAssessmentType=${payload.type || ''}&newAssessmentTitle=${encodeURIComponent(
              payload.title || ''
            )}`
          );
        } else if (courseIdForRedirect) {
          router.push(`/teacher/courses/${courseIdForRedirect}`);
        } else if (id) {
          router.push(`/teacher/assessments/${id}`);
        } else {
          router.push('/teacher/assessments');
        }
      },
      onError: (err: any) => {
        const serverMsg =
          err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          `حدث خطأ أثناء إنشاء ${label}`;
        toast.error(
          Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg
        );
      },
    });
  };

  return {
    router,
    currentStep,
    setCurrentStep,
    targetScope,
    setTargetScope,
    dueDateOption,
    setDueDateOption,
    homeworkMode,
    setHomeworkMode,
    startPage,
    setStartPage,
    endPage,
    setEndPage,
    bookletImages,
    setBookletImages,
    isUploadingBooklet,
    createAssessment,
    isPending,
    methods,
    fields,
    append,
    remove,
    formDataValues,
    selectedStage,
    selectedGrade,
    scheduleMode: schedule.scheduleMode,
    selectScheduleMode: schedule.selectScheduleMode,
    handleStartChange: schedule.handleStartChange,
    handleEndChange: schedule.handleEndChange,
    syncCloseFromDuration: schedule.syncCloseFromDuration,
    nowIso,
    allGroups,
    teacherCourses,
    availableGroups,
    courseLinkScope,
    paramLessonTitle,
    paramModuleName,
    handleBookletImageUpload,
    nextStep,
    onSubmit,
  };
}
