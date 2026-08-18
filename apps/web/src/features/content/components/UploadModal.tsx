'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UploadCloud, FileText, Loader2, Calendar, Layers, BookOpen } from 'lucide-react';
import { ContentType } from '../types/content.types';
import { useUploadContent } from '../hooks/use-content';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import toast from 'react-hot-toast';

const ALL_GRADE_LEVELS = [
  { value: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي' },
  { value: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي' },
  { value: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي' },
  { value: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي' },
  { value: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي' },
  { value: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي' },
  { value: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي' },
  { value: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي' },
  { value: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي' },
  { value: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي' },
  { value: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي' },
  { value: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي' },
];

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
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
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
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groupsData } = useGroups();
  const groups = groupsData || [];
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

  const { mutate: uploadContent, isPending } = useUploadContent();

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

  // Sync defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialGradeLevel) setValue('gradeLevel', initialGradeLevel);
      if (initialGroupId) {
        setValue('groupId', initialGroupId);
        setValue('targetScope', 'SPECIFIC_GROUP');
      }
      if (initialSessionTopic) setValue('sessionTopic', initialSessionTopic);
      if (initialSessionId) setValue('sessionId', initialSessionId);
    }
  }, [isOpen, initialGradeLevel, initialGroupId, initialSessionTopic, initialSessionId, setValue]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPending) return;
    setFile(null);
    setFileError(null);
    reset();
    onClose();
  };

  const validateFile = (selectedFile: File): boolean => {
    setFileError(null);

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد الأقصى (100MB)');
      return false;
    }

    if (!selectedFile.type && !selectedFile.name.match(/\.(pdf|jpg|jpeg|png|webp|mp3|wav|mp4|doc|docx)$/i)) {
      setFileError('نوع الملف غير مدعوم');
      return false;
    } else if (selectedFile.type && !ALLOWED_TYPES.includes(selectedFile.type)) {
      setFileError(`نوع الملف غير مدعوم. الأنواع المسموحة: PDF, صور, صوت, فيديو MP4, و Word`);
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
          academicYear: activeYear || '2025-2026',
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

  // Filter groups ONLY to the current active academic year, semester, and selected grade level
  const filteredGroups = groups.filter((g) => {
    if (activeYear && g.academicYear && g.academicYear !== activeYear) return false;
    if (activeTerm && g.academicTerm && g.academicTerm !== activeTerm) return false;
    if (selectedGradeLevel && g.gradeLevel !== selectedGradeLevel) return false;
    return true;
  });

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
              <p className="text-xs text-slate-500">إضافة ملفات ومذكرات تعليمية وتخصيصها للحصص والمجموعات</p>
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

            {/* Scope / Grade & Session Scoping */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Layers className="w-4 h-4 text-primary-600" />
                تحديد الصف الدراسي ونطاق الظهور:
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
                    اختر المجموعة (للعام الحالي {activeYear}) <span className="text-red-500">*</span>
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
                  {filteredGroups.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                      لا توجد مجموعات مسجلة لهذا الصف في العام الدراسي الحالي ({activeYear}).
                    </p>
                  )}
                </div>
              )}

              {/* Session / Lesson Topic */}
              <div className="pt-2">
                <Label className="mb-1 block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>الحصة أو الدرس المرتبط (اختياري)</span>
                  <span className="text-[10px] text-slate-400 font-normal">مثال: الحصة 1، شرح النحو، مراجعة شهر أكتوبر</span>
                </Label>
                <div className="relative">
                  <Input
                    {...register('sessionTopic')}
                    placeholder="مثال: الحصة الأولى - اسم الفاعل وصياغته"
                    disabled={isPending}
                    className="text-sm"
                  />
                </div>
                {selectedTargetScope === 'ALL_GRADE_GROUPS' && selectedGradeLevel && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    ✓ سيظهر هذا الملف لجميع مجموعات ({selectedGradeLevel}) عند فتح هذه الحصة.
                  </p>
                )}
              </div>
            </div>

            {/* File Drop/Select Area */}
            <div>
              <Label className="mb-2 block text-sm font-bold text-slate-700">
                الملف المرفق <span className="text-red-500">*</span>
              </Label>

              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    fileError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80'
                  }`}
                  onClick={() => !isPending && fileInputRef.current?.click()}
                >
                  <UploadCloud className={`w-9 h-9 mx-auto mb-2 ${fileError ? 'text-red-400' : 'text-slate-400'}`} />
                  <p className="text-sm font-bold text-slate-700 mb-1">اضغط لاختيار ملف من جهازك</p>
                  <p className="text-xs text-slate-500 mb-2">الحد الأقصى: 100 ميجابايت (PDF, Word, MP4, MP3, صور)</p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4"
                    disabled={isPending}
                  />

                  {fileError && <p className="text-red-500 text-xs font-bold mt-2">{fileError}</p>}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-primary/10 text-primary w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  {!isPending && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
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
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            form="upload-content-form"
            disabled={isPending || !file}
            className="shadow-md shadow-primary/20"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الرفع والحفظ...
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
  );
}


