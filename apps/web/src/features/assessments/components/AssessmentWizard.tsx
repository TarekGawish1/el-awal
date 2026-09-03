'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Plus, AlertTriangle, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { generatePresignedUrl, uploadFileToR2, uploadRawFile } from '@/features/content/api/content.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { createAssessmentSchema, CreateAssessmentFormData } from '../types/assessments.schema';
import { QuestionType } from '../types/assessments.types';
import { AssessmentQuestionEditor } from './AssessmentQuestionEditor';
import { useCreateAssessment } from '../hooks/use-assessments';
import { useGroups } from '../../groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '../../groups/hooks/useAcademicPeriod';
import { useTeacherCourses } from '@/features/courses/hooks/useCourses';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

type Step = 'metadata' | 'questions' | 'review';

import { Group, GroupSchedule } from '../../groups/types/groups.types';

function getGroupNextSessionDate(group: Group): Date | null {
  if (!group.schedules || group.schedules.length === 0) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(15, 0, 0, 0); // 3:00 PM
    return nextWeek;
  }
  
  const now = new Date();
  let nextSessionDate: Date | null = null;
  let minDiff = Infinity;
  
  group.schedules.forEach((sched: GroupSchedule) => {
    let schedDay = 0;
    if (typeof sched.dayOfWeek === 'number') {
      schedDay = sched.dayOfWeek;
    } else {
      const daysMap: Record<string, number> = {
        'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
        'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
      };
      schedDay = daysMap[sched.dayOfWeek as string] ?? 0;
    }
    
    let hours = 15;
    let minutes = 0;
    if (sched.startTime) {
      const [h, m] = sched.startTime.split(':').map(Number);
      if (!isNaN(h)) hours = h;
      if (!isNaN(m)) minutes = m;
    }
    
    const currentDay = now.getDay();
    let daysDiff = (schedDay - currentDay + 7) % 7;
    
    // For homework given in a session, the deadline is the subsequent session occurrence
    if (daysDiff === 0) {
      daysDiff = 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysDiff);
    targetDate.setHours(hours, minutes, 0, 0);
    
    const diffTime = targetDate.getTime() - now.getTime();
    if (diffTime > 0 && diffTime < minDiff) {
      minDiff = diffTime;
      nextSessionDate = targetDate;
    }
  });
  
  return nextSessionDate;
}

function getNextSessionDate(groups: Group[], targetGroupIds: string[]): Date | null {
  if (!targetGroupIds || targetGroupIds.length === 0) return null;
  
  const selectedGroups = groups.filter(g => targetGroupIds.includes(g.id));
  let latestDate: Date | null = null;
  
  selectedGroups.forEach(g => {
    const d = getGroupNextSessionDate(g);
    if (d) {
      if (!latestDate || d.getTime() > latestDate.getTime()) {
        latestDate = d;
      }
    }
  });
  
  return latestDate;
}

export function AssessmentWizard({ type = 'EXAM' }: { type?: 'EXAM' | 'ASSIGNMENT' }) {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName={type === 'ASSIGNMENT' ? 'إنشاء واجب' : 'إنشاء اختبار'}
        description={
          type === 'ASSIGNMENT'
            ? 'إنشاء الواجبات وتوليد الأسئلة يتطلب اتصالاً نشطاً بالخادم.'
            : 'إنشاء الاختبارات وتوليد الأسئلة يتطلب اتصالاً نشطاً بالخادم.'
        }
        backHref="/teacher/dashboard"
      />
    );
  }
  const paramGroupId = searchParams.get('groupId');
  const paramTopic = searchParams.get('topic');
  const paramDueDate = searchParams.get('dueDate');
  const paramCourseId = searchParams.get('courseId');
  const paramCourseName = searchParams.get('courseName');
  const paramModuleId = searchParams.get('moduleId');
  const paramModuleName = searchParams.get('moduleName');
  const paramScope = searchParams.get('scope');
  const courseLinkScope =
    type === 'EXAM' &&
    paramCourseId &&
    (paramScope === 'COURSE' || (paramScope === 'UNIT' && paramModuleId))
      ? paramScope
      : null;

  const { data: teacherCourses } = useTeacherCourses();

  const [currentStep, setCurrentStep] = useState<Step>('metadata');
  const [targetScope, setTargetScope] = useState<'GROUPS' | 'COURSE'>(paramCourseId ? 'COURSE' : 'GROUPS');
  const [dueDateOption, setDueDateOption] = useState<'NEXT_SESSION' | 'CUSTOM'>(paramDueDate ? 'CUSTOM' : 'NEXT_SESSION');
  const [homeworkMode, setHomeworkMode] = useState<'INTERACTIVE' | 'BOOKLET'>('INTERACTIVE');
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
      questions: [
        {
          questionNumber: 1,
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          questionText: '',
          optionsData: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
          correctAnswer: '',
          displayOrder: 0,
        }
      ],
      academicStage: '',
      gradeLevel: '',
      targetGroupIds: [],
      courseId: paramCourseId || null,
    },
    mode: 'onTouched'
  });

  const { control, handleSubmit, formState: { errors }, trigger, getValues } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  });

  const formDataValues = methods.watch();
  const selectedStage = formDataValues.academicStage;
  const selectedGrade = formDataValues.gradeLevel;

  // Exam scheduling mode. Tracked separately from `timingType` because the
  // "duration only" option reuses the FLEXIBLE_WINDOW timing type but omits any
  // start/close dates: the exam is always open and each student gets the full
  // duration from the moment they start.
  const [scheduleMode, setScheduleMode] = useState<'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | 'DURATION_ONLY'>(
    formDataValues.timingType === 'FLEXIBLE_WINDOW' ? 'FLEXIBLE_WINDOW' : 'FIXED_SESSION'
  );

  const selectScheduleMode = (mode: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | 'DURATION_ONLY') => {
    setScheduleMode(mode);
    if (mode === 'DURATION_ONLY') {
      // Reuse FLEXIBLE_WINDOW on the backend, but clear the window entirely.
      methods.setValue('timingType', 'FLEXIBLE_WINDOW', { shouldDirty: true, shouldValidate: true });
      methods.setValue('startTime', '', { shouldDirty: true, shouldValidate: true });
      methods.setValue('startDate', '', { shouldDirty: true, shouldValidate: true });
      methods.setValue('endTime', '', { shouldDirty: true, shouldValidate: true });
      methods.setValue('dueDate', '', { shouldDirty: true, shouldValidate: true });
    } else {
      methods.setValue('timingType', mode, { shouldDirty: true, shouldValidate: true });
    }
  };

  // In a live/fixed session (جلسة اختبار مباشرة) the exam runs for everyone from the
  // start time until the close time, so its duration is exactly the window length.
  // Keep the three fields linked: editing any one updates the others so that
  // (close − start) always equals the duration. In the other modes the duration is
  // per-student and independent of the window, so no linking is applied there.
  const handleStartChange = (iso: string) => {
    methods.setValue('startTime', iso, { shouldValidate: true, shouldDirty: true });
    methods.setValue('startDate', iso, { shouldValidate: true, shouldDirty: true });
    if (scheduleMode !== 'FIXED_SESSION') return;
    const start = new Date(iso);
    if (isNaN(start.getTime())) return;
    const endRaw = methods.getValues('endTime');
    const end = endRaw ? new Date(endRaw) : null;
    if (end && !isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      // A valid window already exists → the duration mirrors it.
      methods.setValue('durationMinutes', Math.round((end.getTime() - start.getTime()) / 60000), {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      // No usable close yet (or it now precedes the start) → derive it from start + duration.
      const mins = Number(methods.getValues('durationMinutes'));
      if (mins > 0) {
        const newEnd = new Date(start.getTime() + mins * 60000).toISOString();
        methods.setValue('endTime', newEnd, { shouldValidate: true, shouldDirty: true });
        methods.setValue('dueDate', newEnd, { shouldValidate: true, shouldDirty: true });
      }
    }
  };

  const handleEndChange = (iso: string) => {
    methods.setValue('endTime', iso, { shouldValidate: true, shouldDirty: true });
    methods.setValue('dueDate', iso, { shouldValidate: true, shouldDirty: true });
    if (scheduleMode !== 'FIXED_SESSION') return;
    const startRaw = methods.getValues('startTime');
    const start = startRaw ? new Date(startRaw) : null;
    const end = new Date(iso);
    if (!start || isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins > 0) {
      methods.setValue('durationMinutes', mins, { shouldValidate: true, shouldDirty: true });
    }
  };

  const syncCloseFromDuration = (rawMinutes: string) => {
    if (scheduleMode !== 'FIXED_SESSION') return;
    const mins = Number(rawMinutes);
    if (!mins || mins <= 0) return;
    const startRaw = methods.getValues('startTime');
    const start = startRaw ? new Date(startRaw) : null;
    if (!start || isNaN(start.getTime())) return;
    const newEnd = new Date(start.getTime() + mins * 60000).toISOString();
    methods.setValue('endTime', newEnd, { shouldValidate: true, shouldDirty: true });
    methods.setValue('dueDate', newEnd, { shouldValidate: true, shouldDirty: true });
  };

  const durationRegister = methods.register('durationMinutes');

  // Current instant, recomputed each render, used to forbid scheduling in the past.
  const nowIso = new Date().toISOString();

  const { data: allGroups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(allGroups);
  
  const watchedTargetGroupIds = formDataValues.targetGroupIds;

  // Prefill online course ID from query params if provided
  useEffect(() => {
    if (paramCourseId) {
      setTargetScope('COURSE');
      methods.setValue('courseId', paramCourseId, { shouldValidate: true });
    }
  }, [paramCourseId, methods]);

  // Pre-fill the exam title when creating from a course builder context.
  useEffect(() => {
    if (courseLinkScope === 'UNIT' && paramModuleName && !methods.getValues('title')) {
      methods.setValue('title', `اختبار وحدة: ${paramModuleName}`, { shouldValidate: true });
      return;
    }

    if (courseLinkScope === 'COURSE' && !methods.getValues('title')) {
      const selectedCourse = teacherCourses?.find((course) => course.id === paramCourseId);
      const courseName = paramCourseName || selectedCourse?.title;
      if (courseName) {
        methods.setValue('title', `الاختبار النهائي: ${courseName}`, { shouldValidate: true });
      }
    }
  }, [courseLinkScope, paramCourseId, paramCourseName, paramModuleName, teacherCourses, methods]);

  // Prefill group & topic from search params if provided (e.g. from session calendar modal)
  useEffect(() => {
    if (paramGroupId && allGroups && allGroups.length > 0) {
      const g = allGroups.find(group => group.id === paramGroupId);
      if (g) {
        let stage = 'SECONDARY';
        if (g.gradeLevel?.includes('الابتدائي')) stage = 'PRIMARY';
        else if (g.gradeLevel?.includes('الإعدادي')) stage = 'MIDDLE';

        methods.setValue('academicStage', stage, { shouldValidate: true });
        methods.setValue('gradeLevel', g.gradeLevel, { shouldValidate: true });
        methods.setValue('targetGroupIds', [g.id], { shouldValidate: true });

        if (paramTopic && !methods.getValues('title')) {
          const prefix = type === 'ASSIGNMENT' ? 'واجب' : 'اختبار';
          methods.setValue('title', `${prefix}: ${paramTopic}`, { shouldValidate: true });
        }

        if (paramDueDate) {
          setDueDateOption('CUSTOM');
          methods.setValue('dueDate', new Date(paramDueDate).toISOString(), { shouldValidate: true });
        }
      }
    }
  }, [paramGroupId, paramTopic, paramDueDate, allGroups, type, methods]);

  useEffect(() => {
    if (type === 'ASSIGNMENT' && dueDateOption === 'NEXT_SESSION') {
      const calculatedDate = getNextSessionDate(allGroups || [], watchedTargetGroupIds || []);
      if (calculatedDate) {
        methods.setValue('dueDate', calculatedDate.toISOString(), { shouldValidate: true, shouldDirty: true });
      } else {
        methods.setValue('dueDate', '', { shouldValidate: true });
      }
    }
  }, [watchedTargetGroupIds, dueDateOption, allGroups, type]);

  const availableGroups = allGroups?.filter(g => 
    g.gradeLevel === selectedGrade && 
    g.academicYear === activeYear && 
    g.academicTerm === activeTerm
  ) || [];

  const gradeOptions: Record<string, { label: string; value: string }[]> = {
    PRIMARY: [
      { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
      { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
      { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
      { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
      { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
      { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
    ],
    MIDDLE: [
      { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
      { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
      { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
    ],
    SECONDARY: [
      { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
      { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
      { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
    ],
  };

  const handleBookletImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const res = await uploadRawFile(file, 'booklets');
          uploadedUrls.push(res.fileUrl);
        } catch {
          const presigned = await generatePresignedUrl({
            fileName: file.name,
            contentType: file.type || 'image/jpeg',
            fileSizeBytes: file.size,
            folder: 'assessments',
          });

          await uploadFileToR2(presigned.uploadUrl, file);
          uploadedUrls.push(presigned.publicUrl);
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
      isValid = await trigger(['title', 'description', 'totalScore', 'passingScore', 'startTime', 'endTime', 'startDate', 'dueDate', 'durationMinutes']);
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
        
        // Populate single booklet essay question
        methods.setValue('questions', [
          {
            questionNumber: 1,
            questionType: QuestionType.ESSAY,
            points: methods.getValues('totalScore') || 10,
            questionText: `حل صفحات الملزمة من صفحة ${startPage} إلى صفحة ${endPage}`,
            optionsData: bookletImages, // store as json
            correctAnswer: 'Booklet submission',
            displayOrder: 1,
          }
        ], { shouldValidate: true });
        
        isValid = true;
      } else {
        isValid = await trigger('questions');
        if (isValid && fields.length === 0) {
          toast.error('يجب إضافة سؤال واحد على الأقل');
          isValid = false;
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
    const payloadQuestions = data.questions.map((q, idx) => {
      const { displayOrder, ...rest } = q;
      return { ...rest, questionNumber: idx + 1 };
    });
    
    // Scrub empty fields
    const payload: any = {
      ...data,
      type,
      isPublished,
      questions: payloadQuestions,
    };
    
    if (type === 'ASSIGNMENT') {
      delete payload.durationMinutes;
      delete payload.startDate;
      delete payload.startTime;
      delete payload.endTime;
      delete payload.timingType;
    } else {
      if (payload.startTime) {
        payload.startDate = payload.startTime;
      }
      if (payload.endTime) {
        payload.dueDate = payload.endTime;
        payload.deadline = payload.endTime;
      }
      if (!payload.startDate) delete payload.startDate;
      if (!payload.startTime) delete payload.startTime;
      if (!payload.endTime) delete payload.endTime;
      if (!payload.durationMinutes) delete payload.durationMinutes;
    }
    
    if (!payload.dueDate) delete payload.dueDate;
    if (!payload.academicStage) delete payload.academicStage;
    if (!payload.gradeLevel) delete payload.gradeLevel;
    if (!payload.targetGroupIds || payload.targetGroupIds.length === 0) delete payload.targetGroupIds;
    if (!payload.courseId) delete payload.courseId;

    if (courseLinkScope && paramCourseId) {
      payload.courseId = paramCourseId;
      payload.courseLinkScope = courseLinkScope;
      if (courseLinkScope === 'UNIT' && paramModuleId) {
        payload.moduleId = paramModuleId;
      }
    }
    
    // Remove extra properties that the backend ValidationPipe forbids
    delete payload.isAutoGraded;

    const label = type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار';
    // When the assessment is linked to an online course (typically created via the
    // "Create Exam" shortcut inside the course builder), return to that course page
    // after saving instead of the standalone assessment view.
    const courseIdForRedirect = (payload.courseId as string | undefined) || paramCourseId || null;

    createAssessment(
      payload,
      {
        onSuccess: (res: any) => {
          toast.success(isPublished ? `تم إنشاء ونشر ${label} بنجاح` : `تم حفظ ${label} كمسودة`);
          const id = res?.id || res?.data?.id;
          if (courseIdForRedirect) {
            router.push(`/teacher/courses/${courseIdForRedirect}`);
          } else if (id) {
            router.push(`/teacher/assessments/${id}`);
          } else {
            router.push('/teacher/assessments');
          }
        },
        onError: (err: any) => {
          toast.error(err?.message || `حدث خطأ أثناء إنشاء ${label}`);
        }
      }
    );
  };

  const formData = getValues();
  const questionsSum = formData.questions?.reduce((sum, q) => sum + (Number(q.points) || 0), 0) || 0;

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto pb-64">
        
        {/* Progress Stepper */}
        <div className="mb-12 relative">
          {/* Background line aligned to circle centers */}
          <div className="absolute top-5 left-[20px] right-[20px] h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full">
            {/* Active progress line */}
            <div 
              className="absolute top-0 right-0 h-full bg-primary-500 transition-all duration-500 ease-out rounded-full"
              style={{ 
                width: currentStep === 'metadata' ? '0%' : 
                       currentStep === 'questions' ? '50%' : '100%' 
              }}
            />
          </div>
          
          <div className="relative z-10 flex justify-between">
            {['metadata', 'questions', 'review'].map((step, index) => {
              const isCompleted = 
                (currentStep === 'questions' && index === 0) || 
                (currentStep === 'review' && index <= 1);
              const isCurrent = currentStep === step;
              
              const stepTitles = ['المعلومات الأساسية', 'الأسئلة', 'المراجعة والنشر'];
              
              return (
                <div key={step} className="flex flex-col items-center w-24">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 shadow-sm
                      ${isCompleted ? 'bg-primary-500 border-primary-500 text-white' : 
                        isCurrent ? 'bg-white border-primary-500 text-primary-600 ring-4 ring-primary-50' : 
                        'bg-white border-slate-200 text-slate-400'}`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`mt-3 text-sm font-bold text-center transition-colors ${isCurrent || isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                    {stepTitles[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
          
          {currentStep === 'metadata' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">المعلومات الأساسية</h2>
                <p className="text-slate-500 text-sm">أدخل تفاصيل {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} مثل العنوان، الوصف، والجهة المستهدفة.</p>
              </div>

              {/* Context banner: shown when opened from course builder */}
              {courseLinkScope && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in">
                  <span className="text-xl shrink-0 mt-0.5">🔗</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-900">
                      {courseLinkScope === 'UNIT' && paramModuleName
                        ? `سيتم ربط هذا الاختبار تلقائياً بوحدة: "${paramModuleName}"`
                        : 'سيتم ربط هذا الاختبار تلقائياً كاختبار نهائي للكورس'}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      بمجرد حفظ الاختبار سيظهر مرتبطاً في صفحة الكورس دون الحاجة لاختياره يدوياً.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">{type === 'ASSIGNMENT' ? 'عنوان الواجب' : 'عنوان الاختبار'} <span className="text-red-500">*</span></Label>
                  <Input 
                    {...methods.register('title')} 
                    placeholder={type === 'ASSIGNMENT' ? "مثال: واجب النحو والبلاغة الأول" : "مثال: امتحان منتصف الفصل الدراسي الأول"}
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                {/* Target Scope Selection: Groups vs Online Course */}
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800 block">
                    الجهة المستهدفة للـ{type === 'ASSIGNMENT' ? 'واجب' : 'اختبار'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!!courseLinkScope}
                      onClick={() => {
                        setTargetScope('GROUPS');
                        methods.setValue('courseId', null);
                      }}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        targetScope === 'GROUPS'
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base">🏫</span>
                      <span>مجموعات الحضور والسنتر</span>
                    </button>

                    <button
                      type="button"
                      disabled={!!courseLinkScope}
                      onClick={() => {
                        setTargetScope('COURSE');
                        methods.setValue('targetGroupIds', []);
                      }}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        targetScope === 'COURSE'
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base">💻</span>
                      <span>كورس ودورة أونلاين</span>
                    </button>
                  </div>
                </div>

                {targetScope === 'COURSE' ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                    <Label className="font-bold text-slate-800 block">
                      اختر الكورس الأونلاين المرتبط <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formDataValues.courseId || ''}
                      disabled={!!courseLinkScope}
                      onChange={(e) => {
                        methods.setValue('courseId', e.target.value || null, { shouldValidate: true });
                      }}
                      options={[
                        { label: '-- اختر الكورس الأونلاين من القائمة --', value: '' },
                        ...(teacherCourses?.map((c: any) => ({
                          label: `${c.title} (${c.subject || 'عام'})`,
                          value: c.id,
                        })) || []),
                      ]}
                    />
                    {(!teacherCourses || teacherCourses.length === 0) && (
                      <p className="text-xs text-slate-500 mt-1">
                        لم يتم العثور على كورسات أونلاين حالياً. يمكنك إنشاء كورس من قسم "الكورسات أونلاين".
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="mb-2 block">المرحلة الدراسية (اختياري)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'PRIMARY', label: 'الابتدائية', icon: '✏️' },
                            { id: 'MIDDLE', label: 'الإعدادية', icon: '🏫' },
                            { id: 'SECONDARY', label: 'الثانوية', icon: '🎓' },
                          ].map((stage) => (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() => {
                                methods.setValue('academicStage', stage.id);
                                methods.setValue('gradeLevel', '');
                              }}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 ${
                                selectedStage === stage.id
                                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                                  : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 text-slate-500'
                              }`}
                            >
                              <span className="text-xl mb-1">{stage.icon}</span>
                              <span className="font-bold text-xs">{stage.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Select
                          label="الصف الدراسي (اختياري)"
                          name="gradeLevel"
                          disabled={!selectedStage}
                          value={formDataValues.gradeLevel || ''}
                          onChange={e => {
                            const newGrade = e.target.value;
                            methods.setValue('gradeLevel', newGrade);
                            const groupsForGrade = allGroups?.filter(g => g.gradeLevel === newGrade) || [];
                            methods.setValue('targetGroupIds', groupsForGrade.map(g => g.id));
                          }}
                          options={[
                            { label: '-- اختر الصف الدراسي --', value: '' },
                            ...(selectedStage ? gradeOptions[selectedStage] : []),
                          ]}
                        />
                      </div>
                    </div>

                    {selectedGrade && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <Label className="mb-3 block font-bold text-slate-800">
                          المجموعات المستهدفة <span className="text-sm font-normal text-slate-500">({type === 'ASSIGNMENT' ? 'اختر المجموعات المستهدفة للواجب' : 'اختر المجموعات التي ستمتحن'})</span>
                        </Label>
                        
                        {availableGroups.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {availableGroups.map(group => (
                              <label key={group.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
                                <input
                                  type="checkbox"
                                  value={group.id}
                                  checked={formDataValues.targetGroupIds?.includes(group.id)}
                                  onChange={(e) => {
                                    const currentIds = formDataValues.targetGroupIds || [];
                                    if (e.target.checked) {
                                      methods.setValue('targetGroupIds', [...currentIds, group.id]);
                                    } else {
                                      methods.setValue('targetGroupIds', currentIds.filter(id => id !== group.id));
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-slate-700">{group.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 bg-white p-4 rounded-lg border border-slate-200 text-center">
                            لا توجد مجموعات مسجلة في هذا الصف الدراسي.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">الدرجة الكلية <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number"
                      {...methods.register('totalScore')} 
                      className={errors.totalScore ? 'border-red-500' : ''}
                    />
                    {errors.totalScore && <p className="text-red-500 text-sm mt-1">{errors.totalScore.message}</p>}
                  </div>
                  <div>
                    <Label className="mb-2 block">درجة النجاح <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number"
                      {...methods.register('passingScore')} 
                      className={errors.passingScore ? 'border-red-500' : ''}
                    />
                    {errors.passingScore && <p className="text-red-500 text-sm mt-1">{errors.passingScore.message}</p>}
                  </div>
                </div>

                {type === 'ASSIGNMENT' ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block font-medium">موعد التسليم <span className="text-red-500">*</span></Label>
                      <div className="flex flex-wrap gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setDueDateOption('NEXT_SESSION');
                            const calculatedDate = getNextSessionDate(allGroups || [], watchedTargetGroupIds || []);
                            if (calculatedDate) {
                              methods.setValue('dueDate', calculatedDate.toISOString(), { shouldValidate: true, shouldDirty: true });
                            } else {
                              methods.setValue('dueDate', '', { shouldValidate: true });
                            }
                          }}
                          className={`py-2 px-4 rounded-xl border-2 text-sm font-bold transition-all shadow-sm ${
                            dueDateOption === 'NEXT_SESSION'
                              ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-50'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          🗓️ الحصة القادمة (تلقائي)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDueDateOption('CUSTOM');
                          }}
                          className={`py-2 px-4 rounded-xl border-2 text-sm font-bold transition-all shadow-sm ${
                            dueDateOption === 'CUSTOM'
                              ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-50'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          ⚙️ تاريخ ووقت مخصص
                        </button>
                      </div>
                    </div>

                    {dueDateOption === 'NEXT_SESSION' ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm max-w-lg space-y-3">
                        <span className="text-slate-500 block">تواريخ التسليم التلقائية لكل مجموعة (موعد الحصة القادمة):</span>
                        {watchedTargetGroupIds && watchedTargetGroupIds.length > 0 ? (
                          <div className="space-y-2">
                            {allGroups
                              ?.filter(g => watchedTargetGroupIds.includes(g.id))
                              .map(group => {
                                const groupDate = getGroupNextSessionDate(group);
                                return (
                                  <div key={group.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-150 shadow-sm">
                                    <span className="font-bold text-slate-700">{group.name}</span>
                                    <span className="text-primary-600 font-bold">
                                      {groupDate
                                        ? groupDate.toLocaleDateString('ar-EG', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                          })
                                        : 'بدون جدول'}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">يرجى تحديد المجموعات المستهدفة أولاً لحساب موعد الحصة القادمة لكل منها.</div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="mb-2 block">اختر تاريخ ووقت التسليم</Label>
                          <DateTimePicker
                            value={formDataValues.dueDate}
                            onChange={(val) => {
                              methods.setValue('dueDate', val, { shouldValidate: true, shouldDirty: true });
                            }}
                            placeholder="اختر تاريخ ووقت التسليم..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                    <div>
                      <Label className="mb-2 block font-bold text-slate-800">
                        نظام توقيت وجدولة الاختبار <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-xs text-slate-500 mb-3">
                        حدد طريقة ضبط وتزامن وقت الاختبار للطلاب:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => selectScheduleMode('FIXED_SESSION')}
                          className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            scheduleMode === 'FIXED_SESSION'
                              ? 'border-primary-500 bg-primary-50/50 text-primary-900 ring-2 ring-primary-100 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm flex items-center gap-1.5">
                              <span>⏱️</span>
                              <span>جلسة اختبار مباشرة</span>
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                              موعد موحد متزامن
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            يبدأ الاختبار في موعد البدء ويغلق تلقائياً لجميع الطلاب عند موعد الإغلاق (المتأخر يُحسب له الوقت المتبقي فقط).
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => selectScheduleMode('FLEXIBLE_WINDOW')}
                          className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            scheduleMode === 'FLEXIBLE_WINDOW'
                              ? 'border-primary-500 bg-primary-50/50 text-primary-900 ring-2 ring-primary-100 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm flex items-center gap-1.5">
                              <span>🗓️</span>
                              <span>نافذة زمنية مرنة</span>
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              مدة فردية
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            يتاح الدخول في أي وقت بين موعد البدء وموعد الإغلاق، ويحصل كل طالب على كامل مدة الاختبار الفردية من لحظة دخوله.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => selectScheduleMode('DURATION_ONLY')}
                          className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            scheduleMode === 'DURATION_ONLY'
                              ? 'border-primary-500 bg-primary-50/50 text-primary-900 ring-2 ring-primary-100 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm flex items-center gap-1.5">
                              <span>⏳</span>
                              <span>مدة فقط</span>
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                              بدون موعد محدد
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            بدون موعد بدء أو إغلاق. الاختبار متاح دائماً، ويحصل كل طالب على كامل المدة المحددة من لحظة بدئه.
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 gap-4 pt-2 ${scheduleMode === 'DURATION_ONLY' ? '' : 'sm:grid-cols-3'}`}>
                      {scheduleMode !== 'DURATION_ONLY' && (
                        <>
                          <div>
                            <Label className="mb-2 block font-medium text-xs text-slate-700">
                              موعد بدء الاختبار <span className="text-red-500">*</span>
                            </Label>
                            <DateTimePicker
                              value={formDataValues.startTime || formDataValues.startDate}
                              onChange={handleStartChange}
                              placeholder="تاريخ ووقت البدء..."
                              minDate={nowIso}
                            />
                            {errors.startTime && (
                              <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>
                            )}
                          </div>

                          <div>
                            <Label className="mb-2 block font-medium text-xs text-slate-700">
                              موعد إغلاق الاختبار <span className="text-red-500">*</span>
                            </Label>
                            <DateTimePicker
                              value={formDataValues.endTime || formDataValues.dueDate}
                              onChange={handleEndChange}
                              placeholder="تاريخ ووقت الإغلاق..."
                              minDate={formDataValues.startTime || formDataValues.startDate || nowIso}
                            />
                            {errors.endTime && (
                              <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>
                            )}
                          </div>
                        </>
                      )}

                      <div className={scheduleMode === 'DURATION_ONLY' ? 'sm:max-w-xs' : ''}>
                        <Label className="mb-2 block font-medium text-xs text-slate-700">
                          مدة الاختبار (بالدقائق) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          {...durationRegister}
                          onChange={(e) => {
                            durationRegister.onChange(e);
                            syncCloseFromDuration(e.target.value);
                          }}
                          placeholder="مثال: 60"
                          className={errors.durationMinutes ? 'border-red-500' : ''}
                        />
                        {errors.durationMinutes && (
                          <p className="text-red-500 text-xs mt-1">{errors.durationMinutes.message}</p>
                        )}
                      </div>
                    </div>

                    {scheduleMode === 'DURATION_ONLY' && (
                      <div className="flex items-start gap-2 rounded-xl bg-violet-50 border border-violet-100 p-3 text-xs text-violet-800 leading-relaxed">
                        <span>ℹ️</span>
                        <span>
                          لن يتم تحديد موعد بدء أو إغلاق. سيكون الاختبار متاحاً للطلاب فور نشره، ويبدأ عدّاد المدة لكل طالب من لحظة دخوله وينتهي تلقائياً بانتهاء المدة المحددة.
                        </span>
                      </div>
                    )}

                    {scheduleMode === 'FIXED_SESSION' && (
                      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 leading-relaxed">
                        <span>🔗</span>
                        <span>
                          المدة مرتبطة تلقائياً بموعدي البدء والإغلاق: أي تعديل في أحدها يُحدِّث الباقي بحيث يظل زمن الجلسة مساوياً للفارق بين موعد الإغلاق وموعد البدء.
                        </span>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Attempt policy: single vs. multiple attempts */}
              <div className="mt-6">
                <Label className="mb-2 block">نظام المحاولات</Label>
                <p className="text-slate-500 text-sm mb-3">
                  حدد ما إذا كان بإمكان الطالب حل هذا الاختبار أكثر من مرة. عند اختيار "محاولات متعددة" يتم اعتماد أعلى درجة كدرجة رسمية مع الاحتفاظ بسجل كل المحاولات.
                </p>
                <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 max-w-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => methods.setValue('allowMultipleAttempts', false, { shouldDirty: true })}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                      !formDataValues.allowMultipleAttempts
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🔒 محاولة واحدة
                  </button>
                  <button
                    type="button"
                    onClick={() => methods.setValue('allowMultipleAttempts', true, { shouldDirty: true })}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                      formDataValues.allowMultipleAttempts
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🔁 محاولات متعددة
                  </button>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                <Button onClick={() => nextStep('questions')}>
                  التالي: الأسئلة
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'questions' && (
            <div className="p-6 sm:p-8 bg-slate-50/50">
              {type === 'ASSIGNMENT' && (
                <div className="mb-8 bg-white p-2 rounded-xl border border-slate-200 flex gap-2 max-w-md mx-auto shadow-sm">
                  <button
                    type="button"
                    onClick={() => setHomeworkMode('INTERACTIVE')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                      homeworkMode === 'INTERACTIVE'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📝 أسئلة تفاعلية
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeworkMode('BOOKLET')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                      homeworkMode === 'BOOKLET'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📖 واجب من الملزمة
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">الأسئلة</h2>
                  <p className="text-slate-500 text-sm">
                    {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' 
                      ? 'حدد الصفحات المطلوبة للواجب من الملزمة.' 
                      : `أضف أسئلة ${type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} وحدد الإجابات الصحيحة والدرجات.`}
                  </p>
                </div>
                {!(type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET') && (
                  <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">إجمالي درجات الأسئلة:</div>
                    <div className={`text-lg font-bold ${questionsSum !== (formDataValues.totalScore || 0) ? 'text-amber-500' : 'text-primary'}`} title={type === 'ASSIGNMENT' ? "الدرجة الكلية المحددة للواجب" : "الدرجة الكلية المحددة للاختبار"}>
                      {questionsSum} / {formDataValues.totalScore}
                    </div>
                  </div>
                )}
              </div>

              {errors.passingScore && (
                <Alert variant="error" className="mb-6">
                  <AlertTriangle className="w-5 h-5 ml-2" />
                  <p>{errors.passingScore.message}</p>
                </Alert>
              )}

              {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' ? (
                // Booklet Mode Form
                <div className="space-y-6 max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">تحديد صفحات الملزمة</h3>
                    <p className="text-slate-500 text-sm">حدد أرقام الصفحات المطلوب حلها من الملزمة وارفع صوراً لها إن وجد.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">من صفحة <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value ? Number(e.target.value) : '')}
                        placeholder="رقم صفحة البدء"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">إلى صفحة <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={endPage}
                        onChange={(e) => setEndPage(e.target.value ? Number(e.target.value) : '')}
                        placeholder="رقم صفحة النهاية"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="block font-medium">صور صفحات الواجب (اختياري)</Label>
                      <div>
                        <input
                          type="file"
                          id="booklet-images-upload"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleBookletImageUpload}
                          disabled={isUploadingBooklet}
                        />
                        <Label
                          htmlFor="booklet-images-upload"
                          className={`text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors font-bold ${
                            isUploadingBooklet ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploadingBooklet ? 'جاري الرفع...' : '➕ رفع صور الصفحات'}
                        </Label>
                      </div>
                    </div>

                    {bookletImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                        {bookletImages.map((url, idx) => (
                          <div key={idx} className="relative aspect-[3/4] rounded-lg border border-slate-200 overflow-hidden group">
                            <img src={url} alt={`Booklet page ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setBookletImages(prev => prev.filter((_, i) => i !== idx))}
                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="absolute bottom-2 left-2 bg-slate-900/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                              صفحة {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                        📸 لم يتم رفع أي صور بعد. (يمكنك رفع صورة واحدة أو أكثر لصفحات الواجب لمساعدة الطلاب).
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between">
                    <Button variant="ghost" onClick={() => setCurrentStep('metadata')}>
                      <ArrowRight className="w-4 h-4 ml-2" />
                      رجوع
                    </Button>
                    <Button onClick={() => nextStep('review')}>
                      التالي: المراجعة
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Interactive Mode Form
                <>
                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <AssessmentQuestionEditor 
                        key={field.id} 
                        index={index} 
                        onRemove={() => remove(index)} 
                      />
                    ))}
                  </div>

                  <div className="mt-8 flex justify-center">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-dashed border-2 bg-white hover:bg-slate-50"
                      onClick={() => append({
                        questionNumber: fields.length + 1,
                        questionType: QuestionType.MULTIPLE_CHOICE,
                        questionText: '',
                        points: 5,
                        displayOrder: fields.length + 1,
                        optionsData: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
                        correctAnswer: '',
                      })}
                    >
                      <Plus className="w-5 h-5 ml-2" />
                      إضافة سؤال جديد
                    </Button>
                  </div>

                  <div className="pt-8 mt-8 border-t border-slate-200 flex justify-between">
                    <Button variant="ghost" onClick={() => setCurrentStep('metadata')}>
                      <ArrowRight className="w-4 h-4 ml-2" />
                      رجوع
                    </Button>
                    <Button onClick={() => nextStep('review')}>
                      التالي: المراجعة
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 'review' && (
            <div className="p-6 sm:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">المراجعة والنشر</h2>
                <p className="text-slate-500 text-sm">راجع تفاصيل {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} قبل حفظه أو نشره للطلاب.</p>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {formData.title}
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">الدرجة الكلية</span>
                    <span className="font-bold text-slate-800 text-lg">{formData.totalScore}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">درجة النجاح</span>
                    <span className="font-bold text-slate-800 text-lg">{formData.passingScore}</span>
                  </div>
                  {type === 'ASSIGNMENT' ? (
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block mb-1">موعد التسليم</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {formData.dueDate 
                          ? new Date(formData.dueDate).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'بدون موعد تسليم'}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block mb-1">المدة المحددة</span>
                      <span className="font-bold text-slate-800 text-lg">
                        {formData.durationMinutes ? `${formData.durationMinutes} دقيقة` : 'بدون وقت'}
                      </span>
                    </div>
                  )}
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block mb-1">
                      {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' ? 'طريقة الحل' : 'عدد الأسئلة'}
                    </span>
                    <span className="font-bold text-slate-800 text-lg">
                      {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' ? 'واجب ملزمة' : `${fields.length} أسئلة`}
                    </span>
                  </div>
                </div>

                {formData.description && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <span className="text-slate-500 text-sm block mb-1">الوصف:</span>
                    <p className="text-slate-700">{formData.description}</p>
                  </div>
                )}
              </div>

              {/* Questions / Booklet Preview */}
              {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' ? (
                <div>
                  <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">تفاصيل واجب الملزمة</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Pages required / الصفحات المطلوبة:</span>
                      <span className="font-bold text-slate-800 bg-white border px-3 py-1 rounded-lg">
                        من صفحة {startPage} إلى صفحة {endPage}
                      </span>
                    </div>
                    {bookletImages.length > 0 ? (
                      <div>
                        <span className="text-slate-600 font-medium block mb-2">الصور المرفوعة للصفحات:</span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {bookletImages.map((url, idx) => (
                            <div key={idx} className="aspect-[3/4] rounded-lg border border-slate-200 overflow-hidden relative shadow-xs">
                              <img src={url} alt={`Booklet page ${idx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 right-1 bg-slate-955/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                صفحة {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-sm">لم يتم إرفاق صور للصفحات.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">نظرة عامة على الأسئلة</h4>
                  <div className="space-y-3">
                    {formData.questions?.map((q, i) => (
                      <div key={i} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <span className="font-medium text-slate-700 block line-clamp-1">{i + 1}. {q.questionText}</span>
                          <span className="text-xs text-slate-500">
                            {q.questionType === QuestionType.MULTIPLE_CHOICE ? 'اختيار من متعدد' : 
                             q.questionType === QuestionType.TRUE_FALSE ? 'صح أم خطأ' : 'مقال'}
                          </span>
                        </div>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold shrink-0">
                          {q.points} درجات
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
                <Button variant="ghost" onClick={() => setCurrentStep('questions')}>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  رجوع للأسئلة
                </Button>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleSubmit((data) => onSubmit(data, false))}
                    disabled={isPending}
                  >
                    حفظ كمسودة
                  </Button>
                  <Button 
                    onClick={handleSubmit((data) => onSubmit(data, true))}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    نشر {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
