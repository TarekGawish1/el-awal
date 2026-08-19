'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  Edit2,
  FileText,
  Loader2,
  Calendar,
  Layers,
  BookOpen,
  UploadCloud,
  FileDown,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ContentType, EducationalContent } from '../types/content.types';
import { useUpdateContent, useGroupSessions } from '../hooks/use-content';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
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

export const STANDARD_LESSONS = [
  'الحصة 1: المحاضرة التأسيسية وتمهيد المنهج',
  'الحصة 2: شرح الوحدة الأولى (الدرس الأول)',
  'الحصة 3: شرح الوحدة الأولى (الدرس الثاني)',
  'الحصة 4: تدريبات وحل تمارين الوحدة الأولى',
  'الحصة 5: اختبار وتقييم الوحدة الأولى',
  'الحصة 6: شرح الوحدة الثانية (الدرس الأول)',
  'الحصة 7: شرح الوحدة الثانية (الدرس الثاني)',
  'الحصة 8: تدريبات وتطبيقات الوحدة الثانية',
  'الحصة 9: مراجعة منتصف الفصل الدراسي (ميدتيرم)',
  'الحصة 10: شرح الوحدة الثالثة (الدرس الأول)',
  'الحصة 11: شرح الوحدة الثالثة (الدرس الثاني)',
  'الحصة 12: تدريبات وحل بنك الأسئلة الشامل',
  'مذكرة المراجعة النهائية ونماذج الامتحانات',
  'حل تدريبات كتاب الوزارة والنماذج الاسترشادية',
];

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
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface EditContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: EducationalContent | null;
}

export function EditContentModal({ isOpen, onClose, content }: EditContentModalProps) {
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groupsData } = useGroups();
  const groups = groupsData || [];
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups as any);

  const { mutate: updateContentMutate, isPending } = useUpdateContent();

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

  // Query sessions for selected group or grade level groups
  const effectiveGroupId =
    selectedTargetScope === 'SPECIFIC_GROUP'
      ? selectedGroupId
      : groups.find((g) => g.gradeLevel === selectedGradeLevel)?.id;

  const { data: groupSessions = [], isLoading: isLoadingSessions } = useGroupSessions(effectiveGroupId);

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

    // Standard lesson option
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
      setFileError(null);
      setIsReplacingFile(false);
    }
  }, [isOpen, content, reset, activeYear, activeTerm]);

  if (!isOpen || !content) return null;

  const handleClose = () => {
    if (isPending) return;
    setReplacementFile(null);
    setFileError(null);
    setIsReplacingFile(false);
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

  const handleSessionDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('sessionId', val);

    if (val && val !== '__CUSTOM__') {
      const matched = groupSessions.find((s) => s.id === val);
      if (matched && matched.topic) {
        setValue('sessionTopic', matched.topic);
      }
    }
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
            toast.success('تم تحديث المرفق بنجاح');
            handleClose();
          },
          onError: (err: any) => {
            toast.error(err.message || 'حدث خطأ أثناء حفظ التعديلات');
          },
        }
      );
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (selectedGradeLevel && g.gradeLevel !== selectedGradeLevel) return false;
    return true;
  });

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'غير معروف';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">تعديل بيانات المرفق</h2>
              <p className="text-xs text-slate-500">تحديث تفاصيل الملف، الدرس المرتبط، أو استبدال الملف المرفوع</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="edit-content-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title & Content Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs font-bold text-slate-700">
                  عنوان المرفق / الملزمة <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register('title')}
                  placeholder="مثال: مذكرة مراجعة النحو الشاملة"
                  disabled={isPending}
                  className="text-sm font-semibold"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <Label className="mb-1 block text-xs font-bold text-slate-700">
                  نوع المرفق <span className="text-red-500">*</span>
                </Label>
                <select
                  {...register('contentType')}
                  disabled={isPending}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                >
                  <option value={ContentType.FILE}>ملف عام / ملزمة</option>
                  <option value={ContentType.SUMMARY}>ملخص دراسي</option>
                  <option value={ContentType.REFERENCE}>مرجع / واجب</option>
                  <option value={ContentType.LECTURE_RECORDING}>تسجيل حصة (فيديو)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1 block text-xs font-bold text-slate-700">وصف المرفق وملاحظات للطلاب</Label>
              <Textarea
                {...register('description')}
                placeholder="أدخل وصفاً مختصراً لمحتوى هذا الملف وإرشادات المذاكرة..."
                disabled={isPending}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Scope / Grade & Session Scoping */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-primary-600" />
                <span>تحديد الصف ونطاق الظهور:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Grade Level */}
                <div>
                  <Label className="mb-1 block text-xs font-bold text-slate-700">
                    الصف الدراسي <span className="text-red-500">*</span>
                  </Label>
                  <select
                    {...register('gradeLevel')}
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  >
                    <option value="">-- اختر الصف الدراسي --</option>
                    {ALL_GRADE_LEVELS.map((g) => (
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
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                        : STANDARD_LESSONS.includes(sessionTopicValue || '')
                        ? sessionTopicValue
                        : sessionTopicValue
                        ? '__CUSTOM__'
                        : ''
                    }
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  >
                    <option value="">-- بدون ربط بحصة محددة (مرفق عام للمنهج) --</option>

                    {groupSessions.length > 0 && (
                      <optgroup label="حصص المجموعة المجدولة">
                        {groupSessions.map((session) => (
                          <option key={session.id} value={`SESSION_${session.id}`}>
                            {session.topic || 'حصة بدون عنوان'} ({session.sessionDate})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="قائمة الدروس والمحاضرات المقترحة">
                      {STANDARD_LESSONS.map((lesson) => (
                        <option key={lesson} value={lesson}>
                          {lesson}
                        </option>
                      ))}
                    </optgroup>

                    <option value="__CUSTOM__">+ كتابة موضوع درس مخصص يدوياً...</option>
                  </select>
                </div>

                <div className="relative">
                  <Input
                    {...register('sessionTopic')}
                    placeholder="عنوان أو موضوع الدرس (مثال: الحصة الأولى - اسم الفاعل والمفعول)"
                    disabled={isPending}
                    className="text-xs sm:text-sm bg-white"
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
                    <span className="text-xs font-bold text-slate-700">رفع ملف جديد بديل:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReplacingFile(false);
                        setReplacementFile(null);
                        setFileError(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                    >
                      إلغاء الاستبدال والاحتفاظ بالملف الحالي
                    </button>
                  </div>

                  {!replacementFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-white hover:bg-slate-50 ${
                        fileError ? 'border-red-300 bg-red-50/20' : 'border-slate-300 hover:border-primary-400'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.mp3,.mp4,.wav"
                      />
                      <UploadCloud className="w-7 h-7 text-primary-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">اضغط لاختيار ملف بديل جديد</p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, Word, صور, تسجيلات (حتى 100MB)</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-emerald-900">{replacementFile.name}</p>
                          <p className="text-[11px] text-emerald-600">{formatFileSize(replacementFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplacementFile(null)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {fileError && <p className="text-xs text-red-500">{fileError}</p>}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            form="edit-content-form"
            disabled={isPending}
            className="shadow-md shadow-primary/20 min-w-[120px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </span>
            ) : (
              'حفظ التعديلات'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
