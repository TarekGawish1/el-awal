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
  durationMinutes: z.coerce.number().min(1, 'المدة يجب أن تكون دقيقة واحدة على الأقل').optional().nullable(),
  dueDate: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
});

type EditMetadataFormData = z.infer<typeof editMetadataSchema>;

export function EditAssessmentMetadataModal({ isOpen, onClose, assessment }: EditMetadataModalProps) {
  const { mutate: updateAssessment, isPending } = useUpdateAssessment();
  const { data: teacherCourses } = useTeacherCourses();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditMetadataFormData>({
    resolver: zodResolver(editMetadataSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: assessment.title,
        description: assessment.description || '',
        durationMinutes: assessment.durationMinutes || undefined,
        dueDate: assessment.dueDate ? new Date(assessment.dueDate).toISOString().slice(0, 16) : undefined,
        courseId: assessment.courseId || undefined,
      });
    }
  }, [isOpen, assessment, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: EditMetadataFormData) => {
    updateAssessment(
      { id: assessment.id, payload: data as any },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">تعديل معلومات الاختبار</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <Label className="mb-2 block">عنوان الاختبار <span className="text-red-500">*</span></Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">المدة (بالدقائق)</Label>
              <Input 
                type="number"
                {...register('durationMinutes')} 
                placeholder="بدون وقت"
              />
              {errors.durationMinutes && <p className="text-red-500 text-sm mt-1">{errors.durationMinutes.message}</p>}
            </div>

            <div>
              <Label className="mb-2 block">تاريخ التسليم</Label>
              <Input 
                type="datetime-local"
                {...register('dueDate')} 
              />
            </div>
          </div>

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
