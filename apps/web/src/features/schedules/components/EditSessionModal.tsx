'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, BookOpen, Loader2, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useUpdateSession, useDeleteSession, useSessionTopics } from '../hooks/useSchedules';
import { LessonSessionItem } from '../types/schedules.types';
import { findSameDayGroupSession, findSessionConflict, formatArabicTimeRange12H } from '../utils/time.utils';
import { ArabicTimeSelect } from './ArabicTimeSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const editSessionSchema = z.object({
  sessionDate: z.string().min(1, 'تاريخ الحصة مطلوب'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  topic: z.string().min(2, 'عنوان أو موضوع الحصة مطلوب'),
  isCancelled: z.boolean().optional(),
  cancellationReason: z.string().optional(),
});

type EditSessionFormData = z.infer<typeof editSessionSchema>;

interface EditSessionModalProps {
  isOpen: boolean;
  session: LessonSessionItem | null;
  onClose: () => void;
  sessions?: LessonSessionItem[];
}

export function EditSessionModal({ isOpen, session, onClose, sessions = [] }: EditSessionModalProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { mutate: updateSessionMutate, isPending } = useUpdateSession();
  const { mutate: deleteSessionMutate, isPending: isDeleting } = useDeleteSession();
  const { data: existingTopics = [] } = useSessionTopics(session?.group?.gradeLevel, session?.groupId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditSessionFormData>({
    resolver: zodResolver(editSessionSchema),
  });

  const isCancelledVal = watch('isCancelled');
  const watchDate = watch('sessionDate');
  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');

  const conflictingSession = useMemo(() => {
    if (!isOpen || !session || isCancelledVal || !watchDate || !watchStartTime) return null;
    return findSessionConflict(sessions, watchDate, watchStartTime, watchEndTime, session.id);
  }, [isOpen, session, isCancelledVal, sessions, watchDate, watchStartTime, watchEndTime]);

  const sameDayGroupSession = useMemo(() => {
    if (!isOpen || !session || isCancelledVal || !watchDate) return null;
    return findSameDayGroupSession(sessions, watchDate, session.groupId, session.id);
  }, [isOpen, session, isCancelledVal, sessions, watchDate]);

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
        isCancelled: !!session.isCancelled,
        cancellationReason: session.cancellationReason || '',
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
    if (!data.isCancelled && sameDayGroupSession) {
      toast.error(`لا يمكن تعديل الحصة: توجد بالفعل حصة أخرى لنفس المجموعة في نفس اليوم (${sameDayGroupSession.topic || ''})`);
      return;
    }

    if (!data.isCancelled && conflictingSession) {
      toast.error('لا يمكن حفظ التعديل لوجود تعارض زمني مع حصة أخرى');
      return;
    }

    updateSessionMutate(
      {
        id: session.id,
        payload: {
          sessionDate: data.sessionDate,
          startTime: data.startTime || undefined,
          endTime: data.endTime || undefined,
          topic: data.topic.trim(),
          isCancelled: data.isCancelled,
          cancellationReason: data.isCancelled ? data.cancellationReason?.trim() || 'إلغاء الحصة لهذا اليوم' : null,
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
    deleteSessionMutate(session.id, {
      onSuccess: () => {
        toast.success('تم حذف الحصة بنجاح');
        setIsDeleteConfirmOpen(false);
        handleClose();
      },
      onError: (err: any) => toast.error(err.message || 'فشل حذف الحصة'),
    });
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
          {/* Cancellation Toggle Banner */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isCancelledVal
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCancelledCheckbox"
                  {...register('isCancelled')}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="isCancelledCheckbox" className="text-xs font-black cursor-pointer select-none">
                  تحديد الحصة كـ «ملغاة» لهذا اليوم
                </label>
              </div>
              {isCancelledVal && (
                <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-md">
                  ملغاة
                </span>
              )}
            </div>

            {isCancelledVal && (
              <div className="mt-2.5 pt-2.5 border-t border-rose-200">
                <Label className="block text-[11px] font-bold text-rose-800 mb-1">
                  سبب الإلغاء (اختياري):
                </Label>
                <Input
                  {...register('cancellationReason')}
                  placeholder="مثال: عطلة رسمية أو ظرف طارئ للمعلم"
                  className="bg-white text-xs h-9 border-rose-200"
                />
              </div>
            )}
          </div>

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
              <ArabicTimeSelect
                label="وقت البدء"
                value={watchStartTime}
                disabled={isPending || isDeleting}
                onChange={(val) => {
                  setValue('startTime', val, { shouldValidate: true });
                  // If endTime is empty or earlier than new start, adjust endTime to val + 90 min
                  const [sH, sM] = val.split(':').map(Number);
                  const endMin = (sH * 60 + (sM || 0) + 90) % (24 * 60);
                  const endH = Math.floor(endMin / 60);
                  const endM = endMin % 60;
                  const defaultEnd = `${endH < 10 ? '0' : ''}${endH}:${endM < 10 ? '0' : ''}${endM}`;
                  if (!watchEndTime || watchEndTime <= val) {
                    setValue('endTime', defaultEnd, { shouldValidate: true });
                  }
                }}
              />
            </div>

            <div>
              <ArabicTimeSelect
                label="وقت الانتهاء"
                value={watchEndTime}
                align="left"
                disabled={isPending || isDeleting}
                onChange={(val) => {
                  setValue('endTime', val, { shouldValidate: true });
                }}
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

          {/* Conflict Warning Banner */}
          {conflictingSession && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5 animate-in fade-in-50 duration-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-900">تنبيه: يوجد تعارض زمني مع حصة أخرى مسجلة!</p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  لديك بالفعل حصة <span className="font-bold">"{conflictingSession.topic}"</span> لمجموعة{' '}
                  <span className="font-bold">
                    ({conflictingSession.group?.gradeLevel || conflictingSession.group?.name || 'مجموعة دراسية'})
                  </span>{' '}
                  في نفس التوقيت ({formatArabicTimeRange12H(conflictingSession.startTime, conflictingSession.endTime)}).
                  يرجى تعديل التوقيت لتفادي التعارض.
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {!session?.scheduleId ? (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isPending || isDeleting}
                className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                حذف الحصة
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending || isDeleting}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isPending || isDeleting || !!conflictingSession}
                title={conflictingSession ? 'يرجى تغيير التوقيت لتفادي التعارض الزمني' : undefined}
                className={`shadow-md shadow-primary/20 min-w-[120px] ${
                  conflictingSession ? 'opacity-50 cursor-not-allowed bg-slate-300 border-slate-300 text-slate-600' : ''
                }`}
              >
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

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="تأكيد حذف الحصة"
        message={`هل أنت متأكد من حذف الحصة "${session?.topic || 'حصة'}" نهائياً من قاعدة البيانات؟`}
        confirmText="حذف الحصة نهائياً"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
