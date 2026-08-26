'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Clock, BookOpen, Layers, Loader2, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { useCreateSession, useSessionTopics } from '../hooks/useSchedules';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LessonSessionItem } from '../types/schedules.types';
import { findSameDayGroupSession, findSessionConflict, formatArabicTimeRange12H, toLocalDateStr } from '../utils/time.utils';
import { ArabicTimeSelect } from './ArabicTimeSelect';
import toast from 'react-hot-toast';

const sessionSchema = z.object({
  groupId: z.string().min(1, 'يجب اختيار المجموعة الدراسية'),
  sessionDate: z.string().min(1, 'تاريخ الحصة مطلوب'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  topic: z.string().min(2, 'عنوان أو موضوع الحصة مطلوب (حرفان على الأقل)'),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroupId?: string;
  initialDate?: string;
  initialTime?: string;
  sessions?: LessonSessionItem[];
}

export function CreateSessionModal({
  isOpen,
  onClose,
  initialGroupId,
  initialDate,
  initialTime,
  sessions = [],
}: CreateSessionModalProps) {
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups as any);
  const { mutate: createSessionMutate, isPending } = useCreateSession();

  const defaultStart = initialTime || '16:00';
  const calculateDefaultEndTime = (sTime: string) => {
    const [sH, sM] = sTime.split(':').map(Number);
    if (isNaN(sH)) return '17:30';
    const endMin = (sH * 60 + (sM || 0) + 90) % (24 * 60);
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;
    return `${endH < 10 ? '0' : ''}${endH}:${endM < 10 ? '0' : ''}${endM}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      groupId: initialGroupId || '',
      sessionDate: initialDate || new Date().toISOString().split('T')[0],
      startTime: defaultStart,
      endTime: calculateDefaultEndTime(defaultStart),
      topic: '',
    },
  });

  const selectedGroupId = watch('groupId');
  const watchDate = watch('sessionDate');
  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const { data: existingTopics = [] } = useSessionTopics(selectedGroup?.gradeLevel, selectedGroupId);

  const conflictingSession = useMemo(() => {
    if (!isOpen || !watchDate || !watchStartTime) return null;
    return findSessionConflict(sessions, watchDate, watchStartTime, watchEndTime);
  }, [isOpen, sessions, watchDate, watchStartTime, watchEndTime]);

  const sameDayGroupSession = useMemo(() => {
    if (!isOpen || !watchDate || !selectedGroupId) return null;
    return findSameDayGroupSession(sessions, watchDate, selectedGroupId);
  }, [isOpen, sessions, watchDate, selectedGroupId]);

  useEffect(() => {
    if (isOpen) {
      const todayStr = toLocalDateStr(new Date());
      const targetDate = initialDate || todayStr;
      let startT = initialTime;

      // If no explicit time was passed (e.g. clicked top header button), pick first non-conflicting candidate hour
      if (!startT) {
        const CANDIDATE_HOURS = ['16:00', '18:00', '14:00', '19:30', '12:00', '10:00', '08:00', '20:00'];
        const availableHour = CANDIDATE_HOURS.find((candidate) => {
          const endC = calculateDefaultEndTime(candidate);
          return !findSessionConflict(sessions, targetDate, candidate, endC);
        });
        startT = availableHour || '16:00';
      }

      reset({
        groupId: initialGroupId || (groups[0]?.id ?? ''),
        sessionDate: targetDate,
        startTime: startT,
        endTime: calculateDefaultEndTime(startT),
        topic: '',
      });
    }
  }, [isOpen, initialGroupId, initialDate, initialTime, groups, sessions, reset]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  const onSubmit = (data: SessionFormData) => {
    if (sameDayGroupSession) {
      toast.error(`لا يمكن إضافة أكثر من حصة لنفس المجموعة في نفس اليوم: توجد بالفعل حصة (${sameDayGroupSession.topic || ''})`);
      return;
    }

    if (conflictingSession) {
      toast.error('لا يمكن حفظ الحصة لوجود تعارض في الموعد مع حصة أخرى مسجلة');
      return;
    }

    createSessionMutate(
      {
        groupId: data.groupId,
        sessionDate: data.sessionDate,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        topic: data.topic.trim(),
      },
      {
        onSuccess: () => {
          toast.success('تمت إضافة وتثبيت الحصة بنجاح في قاعدة البيانات');
          handleClose();
        },
        onError: (err: any) => {
          console.error('Failed to create session:', err);
          const errorMsg =
            err?.response?.data?.message ||
            err?.message ||
            'حدث خطأ أثناء حفظ الحصة، يرجى المحاولة مرة أخرى';
          toast.error(typeof errorMsg === 'string' ? errorMsg : 'حدث خطأ غير متوقع أثناء الحفظ');
        },
      },
    );
  };

  const filteredGroups = groups.filter((g) => {
    if (activeYear && g.academicYear && g.academicYear !== activeYear) return false;
    if (activeTerm && g.academicTerm && g.academicTerm !== activeTerm) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-auto border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">إضافة وتسمية حصة جديدة</h2>
              <p className="text-xs text-slate-500">حفظ الحصة في قاعدة البيانات لتظهر في الجدول ومكتبة المذكرات</p>
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Group Select */}
          <div>
            <Label className="mb-1 block text-xs font-bold text-slate-700">
              المجموعة الدراسية <span className="text-red-500">*</span>
            </Label>
            <select
              {...register('groupId')}
              disabled={isPending || isLoadingGroups}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            >
              <option value="">-- اختر المجموعة --</option>
              {(filteredGroups.length > 0 ? filteredGroups : groups).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.gradeLevel})
                </option>
              ))}
            </select>
            {errors.groupId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.groupId.message}</p>}
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
                disabled={isPending}
                className="h-10 text-xs bg-white rounded-xl"
              />
              {errors.sessionDate && <p className="text-red-500 text-xs mt-1 font-medium">{errors.sessionDate.message}</p>}
            </div>

            <div>
              <ArabicTimeSelect
                label="وقت البدء"
                value={watchStartTime}
                disabled={isPending}
                onChange={(val) => {
                  setValue('startTime', val, { shouldValidate: true });
                  // Automatically adjust endTime to startTime + 90 minutes
                  setValue('endTime', calculateDefaultEndTime(val), { shouldValidate: true });
                }}
              />
            </div>

            <div>
              <ArabicTimeSelect
                label="وقت الانتهاء"
                value={watchEndTime}
                align="left"
                disabled={isPending}
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
              placeholder="مثال: الحصة 1 - اسم الفاعل وصياغته وإعماله"
              disabled={isPending}
              className={`text-sm bg-white ${errors.topic ? 'border-red-500' : ''}`}
            />
            {errors.topic && <p className="text-red-500 text-xs mt-1 font-medium">{errors.topic.message}</p>}

            {/* Quick Topic Chips from Database */}
            {existingTopics.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  موضوعات سابقة مسجلة في قاعدة البيانات (اضغط للاختيار السريع):
                </p>
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
                  يرجى تغيير التوقيت لتجنب تداخل الحصص.
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending || !!conflictingSession}
              title={conflictingSession ? 'يرجى تغيير التوقيت لتفادي التعارض الزمني' : undefined}
              className={`shadow-md shadow-primary/20 min-w-[130px] ${
                conflictingSession ? 'opacity-50 cursor-not-allowed bg-slate-300 border-slate-300 text-slate-600' : ''
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-1.5" />
                  حفظ وتثبيت الحصة
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
