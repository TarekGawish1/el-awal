'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { AssessmentDetail } from '../types/assessments.types';
import { useUpdateAssessment } from '../hooks/use-assessments';
import { useTeacherCourses } from '@/features/courses/hooks/useCourses';
import { Select } from '@/components/ui/Select';
import toast from 'react-hot-toast';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentDetail;
}

const editMetadataSchema = z.object({
  title: z.string().min(3, 'عنوان الاختبار مطلوب ويجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  timingType: z.enum(['FIXED_SESSION', 'FLEXIBLE_WINDOW']).optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().min(1, 'المدة يجب أن تكون دقيقة واحدة على الأقل').optional().nullable(),
  dueDate: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  allowMultipleAttempts: z.boolean().optional(),
  isOptional: z.boolean().optional(),
});

type EditMetadataFormData = z.infer<typeof editMetadataSchema>;

export function EditAssessmentMetadataModal({ isOpen, onClose, assessment }: EditMetadataModalProps) {
  const { mutate: updateAssessment, isPending } = useUpdateAssessment();
  const { data: teacherCourses } = useTeacherCourses();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EditMetadataFormData>({
    resolver: zodResolver(editMetadataSchema),
  });

  const isExam = assessment.type === 'EXAM';

  useEffect(() => {
    if (isOpen) {
      const rawStart = assessment.startTime || assessment.startDate;
      const rawEnd = assessment.endTime || assessment.dueDate || assessment.deadline;
      reset({
        title: assessment.title,
        description: assessment.description || '',
        timingType: (assessment.timingType as any) || 'FIXED_SESSION',
        startTime: rawStart ? new Date(rawStart).toISOString().slice(0, 16) : undefined,
        endTime: rawEnd ? new Date(rawEnd).toISOString().slice(0, 16) : undefined,
        durationMinutes: assessment.durationMinutes || undefined,
        dueDate: rawEnd ? new Date(rawEnd).toISOString().slice(0, 16) : undefined,
        courseId: assessment.courseId || undefined,
        allowMultipleAttempts: assessment.allowMultipleAttempts ?? false,
        isOptional: assessment.isOptional ?? false,
      });
    }
  }, [isOpen, assessment, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: EditMetadataFormData) => {
    const payload: any = { ...data };
    if (isExam) {
      if (data.startTime) {
        payload.startDate = new Date(data.startTime).toISOString();
        payload.startTime = new Date(data.startTime).toISOString();
      }
      if (data.endTime) {
        payload.dueDate = new Date(data.endTime).toISOString();
        payload.deadline = new Date(data.endTime).toISOString();
        payload.endTime = new Date(data.endTime).toISOString();
      }
    }
    updateAssessment(
      { id: assessment.id, payload },
      {
        onSuccess: () => {
          toast.success('تم تحديث معلومات الاختبار بنجاح');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء التحديث');
        }
      }
    );
  };

  const selectedTimingType = watch('timingType') || 'FIXED_SESSION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">تعديل معلومات {isExam ? 'الاختبار' : 'الواجب'}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <Label className="mb-2 block">عنوان {isExam ? 'الاختبار' : 'الواجب'} <span className="text-red-500">*</span></Label>
            <Input 
              {...register('title')} 
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label className="mb-2 block">الوصف (اختياري)</Label>
            <Textarea 
              {...register('description')} 
              rows={3}
            />
          </div>

          {isExam ? (
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <Label className="mb-2 block font-bold text-slate-800 text-xs">
                  نظام التوقيت وجدولة الاختبار <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('timingType', 'FIXED_SESSION', { shouldDirty: true })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      selectedTimingType !== 'FLEXIBLE_WINDOW'
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⏱️ موعد موحد متزامن
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('timingType', 'FLEXIBLE_WINDOW', { shouldDirty: true })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                      selectedTimingType === 'FLEXIBLE_WINDOW'
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🗓️ نافذة زمنية مرنة
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs">موعد بدء الاختبار</Label>
                  <Input 
                    type="datetime-local"
                    {...register('startTime')} 
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">موعد إغلاق الاختبار</Label>
                  <Input 
                    type="datetime-local"
                    {...register('endTime')} 
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs">المدة الفردية (بالدقائق)</Label>
                <Input 
                  type="number"
                  {...register('durationMinutes')} 
                  placeholder="مثال: 60"
                />
                {errors.durationMinutes && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes.message}</p>}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">تاريخ التسليم</Label>
                <Input 
                  type="datetime-local"
                  {...register('dueDate')} 
                />
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">الكورس الأونلاين المرتبط (اختياري)</Label>
            <Select
              {...register('courseId')}
              options={[
                { label: '-- غير مرتبط بكورس أونلاين معين --', value: '' },
                ...(teacherCourses?.map((c: any) => ({
                  label: `${c.title} (${c.subject || 'عام'})`,
                  value: c.id,
                })) || []),
              ]}
            />
          </div>

          <div>
            <Label className="mb-2 block">نظام المحاولات</Label>
            <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 shadow-sm">
              <button
                type="button"
                onClick={() => setValue('allowMultipleAttempts', false, { shouldDirty: true })}
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                  !watch('allowMultipleAttempts')
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔒 محاولة واحدة
              </button>
              <button
                type="button"
                onClick={() => setValue('allowMultipleAttempts', true, { shouldDirty: true })}
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                  watch('allowMultipleAttempts')
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔁 محاولات متعددة
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              عند السماح بمحاولات متعددة يتم اعتماد أعلى درجة كدرجة رسمية مع الاحتفاظ بسجل كل المحاولات.
            </p>
          </div>

          <div>
            <Label className="mb-2 block">إلزامية التقييم (اختياري / إجباري)</Label>
            <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 shadow-sm">
              <button
                type="button"
                onClick={() => setValue('isOptional', false, { shouldDirty: true })}
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                  !watch('isOptional')
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⚠️ إجباري (مطلوب للتقدم)
              </button>
              <button
                type="button"
                onClick={() => setValue('isOptional', true, { shouldDirty: true })}
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                  watch('isOptional')
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                ✨ اختياري (يمكن تخطيه)
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              التقييم الاختياري يتيح للطالب تجاوزه دون أن يمنعه من فتح الدروس أو الوحدات القادمة.
            </p>
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
          <Button variant="outline" onClick={onClose} type="button">
            إلغاء
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
            <Save className="w-4 h-4 ml-2" />
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
}
