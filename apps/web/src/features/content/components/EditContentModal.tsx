'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  Edit,
  UploadCloud,
  FileText,
  Loader2,
  Calendar,
  Layers,
  BookOpen,
  RefreshCw,
  FileDown,
  Check,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  FileCode,
} from 'lucide-react';
import { ContentType, EducationalContent } from '../types/content.types';
import { useUpdateContent, useGroupSessions } from '../hooks/use-content';
import { useSessionTopics } from '@/features/schedules/hooks/useSchedules';
import { formatArabicTime12H } from '@/features/schedules/utils/time.utils';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ProgressBar } from '@/components/ui/ProgressBar';
import toast from 'react-hot-toast';

const ALL_GRADE_LEVELS = [
  { value: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي' },
  { value: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي' },
  { value: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي' },
  { value: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي' },
  { value: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي' },
  { value: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي' },
  { value: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي' },
  { value: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي' },
  { value: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي' },
  { value: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي' },
  { value: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي' },
  { value: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي' },
];

const STAGE_GRADES_MAP: Record<string, string[]> = {
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'المرحلة الثانوية': [
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
};

const STAGE_OPTIONS = [
  { value: '', label: '-- جميع المراحل الدراسية --' },
  { value: 'المرحلة الابتدائية', label: 'المرحلة الابتدائية' },
  { value: 'المرحلة الإعدادية', label: 'المرحلة الإعدادية' },
  { value: 'المرحلة الثانوية', label: 'المرحلة الثانوية' },
];

function getStageFromGrade(grade?: string | null): string {
  if (!grade) return '';
  if (grade.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (grade.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (grade.includes('الثانوي')) return 'المرحلة الثانوية';
  return '';
}

const editSchema = z.object({
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

type EditFormData = z.infer<typeof editSchema>;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface EditContentModalProps {
  isOpen: boolean;
  content: EducationalContent | null;
  onClose: () => void;
}

export function EditContentModal({ isOpen, content, onClose }: EditContentModalProps) {
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

  // Dynamically compute available grades based on selected stage
  const availableGrades = useMemo(() => {
    if (!selectedStage) return ALL_GRADE_LEVELS;
    const stageGrades = STAGE_GRADES_MAP[selectedStage] || [];
    return ALL_GRADE_LEVELS.filter((g) => stageGrades.includes(g.value));
  }, [selectedStage]);

  // Stage change handler
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

  // Grade change handler
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

  const { data: groupSessions = [], isLoading: isLoadingSessions } = useGroupSessions(effectiveGroupId);
  const { data: dbTopics = [] } = useSessionTopics(selectedGradeLevel, effectiveGroupId);

  const rawSessions = groupSessions;
  
  // Filter groupSessions strictly to the active academic year & semester
  const semesterSessions = useMemo(() => {
    if (!Array.isArray(rawSessions)) return [];
    return rawSessions.filter((sess: any) => {
      if (activeYear && sess.academicYear && sess.academicYear !== activeYear) return false;
      if (activeTerm && sess.academicTerm && sess.academicTerm !== activeTerm) return false;
      return true;
    });
  }, [rawSessions, activeYear, activeTerm]);

  // Replacement file category
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

  // Image preview memory lifecycle
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

  // Initialize form whenever content changes or modal opens
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

  // Filter groups to the current active academic year, semester, stage, and selected grade level
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

  if (!isOpen || !content) return null;

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

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'غير معروف';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">تعديل بيانات المرفق</h2>
              <p className="text-xs text-slate-500">تحديث العنوان، نطاق المشاركة، أو استبدال الملف المرفوع</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="edit-content-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title and Content Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-sm font-bold text-slate-700">
                  عنوان الملف / المذكرة <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register('title')}
                  placeholder="مثال: مذكرة مراجعة ليلة الامتحان"
                  className={errors.title ? 'border-red-500' : ''}
                  disabled={isPending}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1 font-medium">{errors.title.message}</p>}
              </div>

              <div>
                <Label className="mb-1 block text-sm font-bold text-slate-700">
                  نوع المحتوى <span className="text-red-500">*</span>
                </Label>
                <select
                  {...register('contentType')}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-100"
                  disabled={isPending}
                >
                  <option value={ContentType.FILE}>ملف عام / ملزمة</option>
                  <option value={ContentType.SUMMARY}>ملخص دراسي</option>
                  <option value={ContentType.REFERENCE}>مرجع أو واجب إضافي</option>
                  <option value={ContentType.LECTURE_RECORDING}>تسجيل حصة (فيديو)</option>
                </select>
                {errors.contentType && <p className="text-red-500 text-xs mt-1 font-medium">{errors.contentType.message}</p>}
              </div>
            </div>

            {/* Scope / Stage, Grade & Session Scoping */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-primary-600" />
                <span>تحديد المرحلة والصف ونطاق الظهور:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Academic Stage */}
                <div>
                  <Label className="mb-1 block text-xs font-bold text-slate-700">
                    المرحلة الدراسية
                  </Label>
                  <select
                    value={selectedStage}
                    onChange={handleStageChange}
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:bg-slate-100 disabled:opacity-75"
                  >
                    {STAGE_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Level */}
                <div>
                  <Label className="mb-1 block text-xs font-bold text-slate-700">
                    الصف الدراسي <span className="text-red-500">*</span>
                  </Label>
                  <select
                    {...register('gradeLevel')}
                    value={selectedGradeLevel || ''}
                    onChange={handleGradeChange}
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:bg-slate-100 disabled:opacity-75"
                  >
                    <option value="">-- اختر الصف الدراسي --</option>
                    {availableGrades.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Scope */}
                <div>
                  <Label className="mb-1 block text-xs font-bold text-slate-700">
                    نطاق الظهور والمشاركة
                  </Label>
                  <select
                    {...register('targetScope')}
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100 disabled:opacity-75"
                  >
                    <option value="ALL_GRADE_GROUPS">جميع مجموعات هذا الصف الدراسي</option>
                    <option value="SPECIFIC_GROUP">مجموعة معينة فقط</option>
                    <option value="GENERAL">عام لجميع المراحل</option>
                  </select>
                </div>
              </div>

              {/* If Specific Group is selected */}
              {selectedTargetScope === 'SPECIFIC_GROUP' && (
                <div className="pt-2">
                  <Label className="mb-1 block text-xs font-bold text-slate-700">
                    اختر المجموعة <span className="text-red-500">*</span>
                  </Label>
                  <select
                    {...register('groupId')}
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100 disabled:opacity-75"
                  >
                    <option value="">-- اختر مجموعة --</option>
                    {filteredGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Session / Lesson Topic */}
              <div className="pt-2 space-y-2">
                <Label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                    اختيار الدرس أو الحصة المرتبطة:
                  </span>
                  <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
                    {isLoadingSessions
                      ? 'جاري التحميل...'
                      : `إجمالي حصص الترم: ${semesterSessions.length} حصة`}
                  </span>
                </Label>

                {/* Dropdown for selecting available lessons/sessions */}
                <div>
                  <select
                    onChange={handleLessonSelectChange}
                    disabled={isPending || isLoadingSessions}
                    value={
                      selectedSessionId
                        ? `SESSION_${selectedSessionId}`
                        : sessionTopicValue && dbTopics.includes(sessionTopicValue)
                        ? `TOPIC_${sessionTopicValue}`
                        : sessionTopicValue
                        ? '__CUSTOM__'
                        : ''
                    }
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:bg-slate-100 disabled:opacity-75"
                  >
                    <option value="">-- بدون ربط بحصة محددة (مرفق عام للمنهج) --</option>

                    {semesterSessions.length > 0 && (
                      <optgroup label={`حصص ${activeTerm === 'SECOND_TERM' ? 'الترم الثاني' : 'الترم الأول'} المجدولة (${semesterSessions.length} حصة)`}>
                        {semesterSessions.map((session) => (
                          <option key={session.id} value={`SESSION_${session.id}`}>
                            {session.topic || 'حصة بدون عنوان'} ({session.sessionDate.includes('T') ? session.sessionDate.split('T')[0] : session.sessionDate}{session.startTime ? ` • ${formatArabicTime12H(session.startTime)}` : ''})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {dbTopics.length > 0 && (
                      <optgroup label="عناوين وموضوعات الحصص المسجلة بقاعدة البيانات">
                        {dbTopics.map((topic) => (
                          <option key={topic} value={`TOPIC_${topic}`}>
                            {topic}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <option value="__CUSTOM__">+ كتابة موضوع درس مخصص يدوياً...</option>
                  </select>
                </div>

                <div className="relative">
                  <Input
                    {...register('sessionTopic')}
                    placeholder="عنوان أو موضوع الدرس (مثال: الحصة الأولى - اسم الفاعل والمفعول)"
                    disabled={isPending}
                    className="text-xs sm:text-sm bg-white disabled:bg-slate-100"
                  />
                </div>
                {selectedTargetScope === 'ALL_GRADE_GROUPS' && selectedGradeLevel && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    ✓ سيظهر هذا الملف لجميع مجموعات ({selectedGradeLevel}) عند فتح هذا الدرس أو الحصة.
                  </p>
                )}
              </div>
            </div>

            {/* Current Attached File & Replace File Section */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">الملف المرفق حالياً:</Label>
                <a
                  href={content.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  معاينة الملف الحالي
                </a>
              </div>

              {!isReplacingFile && !replacementFile ? (
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{content.title}</p>
                      <p className="text-[11px] text-slate-400">{formatFileSize(content.fileSize)}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReplacingFile(true)}
                    className="text-xs h-8 gap-1 rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    استبدال الملف
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">رفع ملف بديل (صورة، فيديو، مستند):</span>
                    {!isPending && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplacingFile(false);
                          setReplacementFile(null);
                          setReplacementPreviewUrl(null);
                          setFileError(null);
                          resetProgress();
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                      >
                        إلغاء الاستبدال والاحتفاظ بالملف الحالي
                      </button>
                    )}
                  </div>

                  {!replacementFile ? (
                    <div
                      onClick={() => !isPending && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-white hover:bg-slate-50 ${
                        fileError ? 'border-red-300 bg-red-50/20' : 'border-slate-300 hover:border-primary-400'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.mp4,.webm,.mov,.wav"
                        disabled={isPending}
                      />
                      <UploadCloud className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">اضغط لاختيار ملف بديل جديد</p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, Word, صور, تسجيلات فيديو MP4 (حتى 100MB)</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {replacementCategory === 'image' && replacementPreviewUrl ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={replacementPreviewUrl}
                                alt="معاينة الصورة البديلة"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {replacementCategory === 'video' ? (
                                <VideoIcon className="w-5 h-5 text-rose-500" />
                              ) : (
                                <FileText className="w-5 h-5 text-primary-600" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{replacementFile.name}</p>
                            <p className="text-[11px] text-slate-500">{formatFileSize(replacementFile.size)}</p>
                          </div>
                        </div>

                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplacementFile(null);
                              setReplacementPreviewUrl(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Upload Progress Bar for replacement */}
                      {isPending && (
                        <ProgressBar
                          progress={uploadProgress}
                          loadedBytes={loadedBytes}
                          totalBytes={totalBytes}
                          stage={uploadStage}
                          fileName={replacementFile.name}
                          statusMessage={
                            uploadStage === 'processing'
                              ? 'جاري حفظ ومعالجة الملف الجديد على الخادم...'
                              : `جاري رفع الملف البديل... ${uploadProgress}%`
                          }
                        />
                      )}
                    </div>
                  )}

                  {fileError && <p className="text-xs text-red-500">{fileError}</p>}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1 block text-sm font-bold text-slate-700">ملاحظات أو وصف إضافي (اختياري)</Label>
              <Textarea
                {...register('description')}
                placeholder="أضف تفاصيل أو تعديل لوصف المرفق..."
                rows={2}
                disabled={isPending}
                className="disabled:bg-slate-100"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isPending && (
              <span className="flex items-center gap-1.5 text-primary-700 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                جاري المعالجة...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              form="edit-content-form"
              disabled={isPending}
              className="shadow-md shadow-primary/20 min-w-[140px]"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadStage === 'uploading'
                    ? `جاري الرفع (${uploadProgress}%)`
                    : 'جاري الحفظ...'}
                </span>
              ) : (
                'حفظ التعديلات'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
