'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Wand2, Calendar, Layers, Loader2, Sparkles } from 'lucide-react';
import { useGenerateSessions } from '../hooks/useSchedules';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import toast from 'react-hot-toast';

const generateSchema = z.object({
  groupId: z.string().min(1, 'يجب اختيار المجموعة الدراسية'),
  startDate: z.string().min(1, 'تاريخ البداية مطلوب'),
  endDate: z.string().min(1, 'تاريخ النهاية مطلوب'),
  topicPrefix: z.string().optional(),
});

type GenerateFormData = z.infer<typeof generateSchema>;

interface GenerateSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroupId?: string;
}

export function GenerateSessionsModal({ isOpen, onClose, initialGroupId }: GenerateSessionsModalProps) {
  const { data: groups = [] } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups as any);
  const { mutate: generateMutate, isPending } = useGenerateSessions();

  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GenerateFormData>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      groupId: initialGroupId || (groups[0]?.id ?? ''),
      startDate: todayStr,
      endDate: nextMonthStr,
      topicPrefix: 'الحصة',
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  const onSubmit = (data: GenerateFormData) => {
    generateMutate(
      {
        groupId: data.groupId,
        payload: {
          startDate: data.startDate,
          endDate: data.endDate,
          topicPrefix: data.topicPrefix || 'الحصة',
        },
      },
      {
        onSuccess: (res) => {
          toast.success(`تم توليد ${res.generatedCount} حصة بنجاح وحفظها في قاعدة البيانات`);
          handleClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء توليد الحصص');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">توليد جدول الحصص تلقائياً</h2>
              <p className="text-xs text-slate-500">إنشاء حصص جماعية للفترة القادمة بناءً على مواعيد المجموعة</p>
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
              disabled={isPending}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
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

          {/* Date Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                من تاريخ <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                {...register('startDate')}
                disabled={isPending}
                className="h-10 text-sm bg-white"
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1 font-medium">{errors.startDate.message}</p>}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                إلى تاريخ <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                {...register('endDate')}
                disabled={isPending}
                className="h-10 text-sm bg-white"
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1 font-medium">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Topic Prefix */}
          <div>
            <Label className="mb-1 block text-xs font-bold text-slate-700">بادئة اسم الحصة (اختياري)</Label>
            <Input
              {...register('topicPrefix')}
              placeholder="مثال: الحصة أو محاضرة"
              disabled={isPending}
              className="text-sm bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              سيتم تسمية الحصص الناتجة تلقائياً مثل: «الحصة - 2026-08-25» ويمكنك إعادة تسميتها لاحقاً.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending} className="shadow-md shadow-purple-600/20 bg-purple-600 hover:bg-purple-700 min-w-[140px]">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ml-1.5" />
                  توليد وحفظ الحصص
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
