'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  UploadCloud,
  FileText,
  Loader2,
  Calendar,
  Layers,
  BookOpen,
  Image as ImageIcon,
  Video as VideoIcon,
  FileCode,
  Music,
  CheckCircle,
} from 'lucide-react';
import { ContentType } from '../types/content.types';
import { useUploadContent, useGroupSessions } from '../hooks/use-content';
import { useSessionTopics, useTeacherSessions } from '@/features/schedules/hooks/useSchedules';
import { formatArabicTime12H } from '@/features/schedules/utils/time.utils';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
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

const uploadSchema = z.object({
  title: z.string().min(3, 'عنوان الملف مطلوب (3 أحرف على الأقل)'),
  description: z.string().optional(),
  contentType: z.nativeEnum(ContentType),
  gradeLevel: z.string().optional(),
  targetScope: z.enum(['ALL_GRADE_GROUPS', 'SPECIFIC_GROUP', 'GENERAL']),
  groupId: z.string().optional(),
  sessionTopic: z.string().optional(),
  sessionId: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

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

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGradeLevel?: string;
  initialGroupId?: string;
  initialSessionTopic?: string;
  initialSessionId?: string;
}

export function UploadModal({
  isOpen,
  onClose,
  initialGradeLevel,
  initialGroupId,
  initialSessionTopic,
  initialSessionId,
}: UploadModalProps) {
  const isOnline = useOnlineStatus();
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
      targetScope: initialGroupId ? 'SPECIFIC_GROUP' : initialGradeLevel ? 'ALL_GRADE_GROUPS' : 'ALL_GRADE_GROUPS',
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

  // Query sessions for a specific group, or all groups in the selected grade.
  const effectiveGroupId =
    selectedTargetScope === 'SPECIFIC_GROUP'
      ? selectedGroupId
      : undefined;

  const { data: selectedGroupSessions = [], isLoading: isLoadingGroupSessions } = useGroupSessions(effectiveGroupId);
  const { data: gradeSessions = [], isLoading: isLoadingGradeSessions } = useTeacherSessions(
    {
      gradeLevel: selectedGradeLevel,
      academicYear: activeYear,
      academicTerm: activeTerm,
      timeframe: 'ALL',
    },
  );
  const { data: dbTopics = [] } = useSessionTopics(
    selectedGradeLevel,
    selectedTargetScope === 'SPECIFIC_GROUP' ? selectedGroupId : undefined,
  );
  const groupSessions = selectedTargetScope === 'SPECIFIC_GROUP' ? selectedGroupSessions : gradeSessions;
  const isLoadingSessions =
    selectedTargetScope === 'SPECIFIC_GROUP' ? isLoadingGroupSessions : isLoadingGradeSessions;

  // Determine file type category (image, video, pdf, audio, other)
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

  // Manage image preview memory lifecycle
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
      const sess = groupSessions.find((s) => s.id === sId);
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

    // Standard lesson option
    setValue('sessionId', '');
    setValue('sessionTopic', val);
  };

  // Sync defaults when modal opens
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

  if (!isOpen) return null;

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="رفع المرفقات"
        description="رفع الفيديوهات والمرفقات التعليمية يتطلب اتصالاً نشطاً بالخادم."
        backHref="/teacher/content"
      />
    );
  }

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

    if (!selectedFile.type && !selectedFile.name.match(/\.(pdf|jpg|jpeg|png|webp|gif|mp3|wav|mp4|webm|mov|doc|docx)$/i)) {
      setFileError('نوع الملف غير مدعوم');
      return false;
    } else if (selectedFile.type && !ALLOWED_TYPES.includes(selectedFile.type)) {
      setFileError(`نوع الملف غير مدعوم. الأنواع المسموحة: PDF, صور, مقاطع فيديو, ملفات صوتية, ومستندات Word`);
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

        // Auto suggest content type for videos
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

  const getFileCategoryIcon = () => {
    switch (fileCategory) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'video':
        return <VideoIcon className="w-5 h-5 text-rose-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileCode className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">رفع مرفقات وملازم الحصص</h2>
              <p className="text-xs text-slate-500">إضافة ملفات ومذكرات تعليمية وفيديوهات وتخصيصها للحصص والمجموعات</p>
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
          <form id="upload-content-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Informative Current Academic Period Banner (Auto applied) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Calendar className="w-4 h-4 text-primary-600 shrink-0" />
                <span>العام الدراسي الحالي:</span>
                <span className="text-primary-700 font-extrabold">{activeYear}</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-bold">
                  {activeTerm === 'SECOND_TERM' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">سيتم ربط الملف بهذه الفترة تلقائياً</span>
            </div>

            {/* Scope / Stage, Grade & Session Scoping */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-primary-600" />
                تحديد المرحلة والصف الدراسي ونطاق الظهور:
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
                    اختر المجموعة (للعام الحالي {activeYear}) <span className="text-red-500">*</span>
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
                  {filteredGroups.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                      لا توجد مجموعات مسجلة لهذا الصف في العام الدراسي الحالي ({activeYear}).
                    </p>
                  )}
                </div>
              )}

              {/* Session / Lesson Topic */}
              <div className="pt-2 space-y-2">
                <Label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                    اختيار الدرس أو الحصة المرتبطة:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">اختياري</span>
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

                    {groupSessions.length > 0 && (
                      <optgroup label="حصص المجموعة المجدولة في قاعدة البيانات">
                        {groupSessions.map((session) => (
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
                    placeholder="عنوان أو موضوع الدرس (مثال: الحصة الأولى - اسم الفاعل وصياغته)"
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

            {/* File Drop/Select Area */}
            <div>
              <Label className="mb-2 block text-sm font-bold text-slate-700">
                الملف المرفق (صورة، فيديو، مذكرة PDF) <span className="text-red-500">*</span>
              </Label>

              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    fileError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80'
                  }`}
                  onClick={() => !isPending && fileInputRef.current?.click()}
                >
                  <UploadCloud className={`w-10 h-10 mx-auto mb-2 ${fileError ? 'text-red-400' : 'text-primary-500'}`} />
                  <p className="text-sm font-bold text-slate-700 mb-1">اضغط لاختيار صورة، فيديو، أو ملف من جهازك</p>
                  <p className="text-xs text-slate-500 mb-2">الحد الأقصى: 100 ميجابايت (صور JPG/PNG/WebP، فيديو MP4، PDF، صوت، Word)</p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.mp4,.webm,.mov"
                    disabled={isPending}
                  />

                  {fileError && <p className="text-red-500 text-xs font-bold mt-2">{fileError}</p>}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Image Thumbnail Preview or Category Icon */}
                      {fileCategory === 'image' && filePreviewUrl ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={filePreviewUrl}
                            alt="معاينة الصورة"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                          {getFileCategoryIcon()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
                            {fileCategory === 'image'
                              ? 'صورة'
                              : fileCategory === 'video'
                              ? 'فيديو'
                              : fileCategory === 'audio'
                              ? 'صوت'
                              : fileCategory === 'pdf'
                              ? 'PDF'
                              : 'مستند'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>

                    {!isPending && (
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                        title="إزالة الملف"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Real-time Upload Progress Bar */}
                  {isPending && (
                    <div className="pt-2">
                      <ProgressBar
                        progress={uploadProgress}
                        loadedBytes={loadedBytes}
                        totalBytes={totalBytes}
                        stage={uploadStage}
                        fileName={file.name}
                        fileType={file.type}
                        statusMessage={
                          uploadStage === 'processing'
                            ? 'تم إرسال الملف! جاري الحفظ والمعالجة السحابية على الخادم...'
                            : fileCategory === 'video'
                            ? `جاري رفع الفيديو... ${uploadProgress}%`
                            : fileCategory === 'image'
                            ? `جاري رفع الصورة... ${uploadProgress}%`
                            : `جاري رفع الملف... ${uploadProgress}%`
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title and Content Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-sm font-bold text-slate-700">
                  عنوان الملف / المذكرة <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register('title')}
                  placeholder="مثال: مذكرة شرح وحل تدريبات الحصة الأولى"
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

            {/* Description */}
            <div>
              <Label className="mb-1 block text-sm font-bold text-slate-700">ملاحظات أو وصف إضافي (اختياري)</Label>
              <Textarea
                {...register('description')}
                placeholder="أضف تعليمات للطلاب أو تفاصيل عن هذا المرفق..."
                rows={2}
                disabled={isPending}
                className="disabled:bg-slate-100"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs text-slate-500">
            {isPending && (
              <span className="flex items-center gap-1.5 text-primary-700 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                يرجى الانتظار حتى اكتمال الرفع...
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              form="upload-content-form"
              disabled={isPending || !file}
              className="shadow-md shadow-primary/20 min-w-[140px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {uploadStage === 'processing' ? 'جاري الحفظ...' : `جاري الرفع (${uploadProgress}%)`}
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 ml-2" />
                  رفع وحفظ المرفق
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
