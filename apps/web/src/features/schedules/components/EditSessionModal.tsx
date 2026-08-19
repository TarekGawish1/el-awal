'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, BookOpen, Loader2, Edit3, Trash2 } from 'lucide-react';
import { useUpdateSession, useDeleteSession, useSessionTopics } from '../hooks/useSchedules';
import { LessonSessionItem } from '../types/schedules.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import toast from 'react-hot-toast';

const editSessionSchema = z.object({
  sessionDate: z.string().min(1, 'تاريخ الحصة مطلوب'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  topic: z.string().min(2, 'عنوان أو موضوع الحصة مطلوب'),
});

type EditSessionFormData = z.infer<typeof editSessionSchema>;

interface EditSessionModalProps {
  isOpen: boolean;
  session: LessonSessionItem | null;
  onClose: () => void;
}

export function EditSessionModal({ isOpen, session, onClose }: EditSessionModalProps) {
  const { mutate: updateSessionMutate, isPending } = useUpdateSession();
  const { mutate: deleteSessionMutate, isPending: isDeleting } = useDeleteSession();
  const { data: existingTopics = [] } = useSessionTopics(session?.group?.gradeLevel, session?.groupId);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditSessionFormData>({
    resolver: zodResolver(editSessionSchema),
  });

  useEffect(() => {
    if (isOpen && session) {
      const dateStr = session.sessionDate.includes('T')
        ? session.sessionDate.split('T')[0]
        : session.sessionDate;
      reset({
        sessionDate: dateStr,
        startTime: session.startTime || '16:00',
        endTime: session.endTime || '',
        topic: session.topic || '',
      });
    }
  }, [isOpen, session, reset]);

  if (!isOpen || !session) return null;

  const handleClose = () => {
    if (isPending || isDeleting) return;
    reset();
    onClose();
  };

  const onSubmit = (data: EditSessionFormData) => {
    updateSessionMutate(
      {
        id: session.id,
        payload: {
          sessionDate: data.sessionDate,
          startTime: data.startTime || undefined,
          endTime: data.endTime || undefined,
          topic: data.topic.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success('تم تحديث بيانات وعنوان الحصة بنجاح');
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء تعديل الحصة');
        },
      },
    );
  };

  const handleDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف هذه الحصة (${session.topic}) نهائياً من قاعدة البيانات؟`)) {
      deleteSessionMutate(session.id, {
        onSuccess: () => {
          toast.success('تم حذف الحصة بنجاح');
          handleClose();
        },
        onError: (err: any) => toast.error(err.message || 'فشل حذف الحصة'),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-auto border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">تعديل بيانات وعنوان الحصة</h2>
              <p className="text-xs text-slate-500">
                {session.group?.name} • {session.group?.gradeLevel}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending || isDeleting}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Date, Start Time, and End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                تاريخ الحصة <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                {...register('sessionDate')}
                disabled={isPending || isDeleting}
                className="h-10 text-xs bg-white rounded-xl"
              />
              {errors.sessionDate && <p className="text-red-500 text-xs mt-1 font-medium">{errors.sessionDate.message}</p>}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary-600" />
                وقت البدء
              </Label>
              <Input
                type="time"
                {...register('startTime')}
                disabled={isPending || isDeleting}
                className="h-10 text-xs bg-white rounded-xl"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                وقت الانتهاء
              </Label>
              <Input
                type="time"
                {...register('endTime')}
                disabled={isPending || isDeleting}
                className="h-10 text-xs bg-white rounded-xl"
              />
            </div>
          </div>

          {/* Session Topic / Name */}
          <div className="space-y-2">
            <Label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary-600" />
              عنوان وموضوع الحصة <span className="text-red-500">*</span>
            </Label>

            <Input
              {...register('topic')}
              placeholder="مثال: الحصة 3 - تدريبات النحو وبنك الأسئلة"
              disabled={isPending || isDeleting}
              className={`text-sm bg-white ${errors.topic ? 'border-red-500' : ''}`}
            />
            {errors.topic && <p className="text-red-500 text-xs mt-1 font-medium">{errors.topic.message}</p>}

            {/* Quick Topic Chips from Database */}
            {existingTopics.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-slate-500 mb-1">اقتراحات سابقة من قاعدة البيانات:</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                  {existingTopics.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue('topic', t)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-primary-50 text-slate-700 hover:text-primary-700 border border-slate-200/80 transition-colors font-medium text-start truncate max-w-[200px]"
                      title={t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || isDeleting}
              className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              حذف الحصة
            </button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending || isDeleting}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending || isDeleting} className="shadow-md shadow-primary/20 min-w-[120px]">
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التعديل'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
