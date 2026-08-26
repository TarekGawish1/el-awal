'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, BookOpen, Loader2, Layers, DollarSign, Package, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useBooklets } from '../hooks/useBooklets';
import { Booklet } from '../types';
import toast from 'react-hot-toast';

const editBookletSchema = z.object({
  title: z.string().min(2, 'يجب إدخال اسم أو عنوان المذكرة'),
  price: z.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
  gradeLevel: z.string().min(1, 'يجب تحديد الصف الدراسي'),
  groupId: z.string().optional(),
  stockCount: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

type EditBookletFormData = z.infer<typeof editBookletSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booklet: Booklet;
  groups?: Array<{ id: string; name: string; gradeLevel?: string }>;
}

const GRADE_LEVELS = [
  'الصف الأول الثانوي',
  'الصف الثاني الثانوي',
  'الصف الثالث الثانوي',
  'الصف الأول الإعدادي',
  'الصف الثاني الإعدادي',
  'الصف الثالث الإعدادي',
  'الصف السادس الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف الرابع الابتدائي',
];

export function EditBookletModal({ isOpen, onClose, booklet, groups = [] }: Props) {
  const { updateBooklet, isUpdating } = useBooklets();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EditBookletFormData>({
    resolver: zodResolver(editBookletSchema),
    defaultValues: {
      title: booklet.title,
      price: booklet.price,
      gradeLevel: booklet.gradeLevel,
      groupId: booklet.groupId || '',
      stockCount: booklet.stockCount !== undefined && booklet.stockCount !== null ? booklet.stockCount : null,
      isActive: booklet.isActive ?? true,
    },
  });

  const selectedGrade = watch('gradeLevel');

  // Filter groups matching selected grade
  const filteredGroups = groups.filter(
    (g) => !g.gradeLevel || g.gradeLevel === selectedGrade,
  );

  if (!isOpen) return null;

  const onSubmit = async (data: EditBookletFormData) => {
    try {
      await updateBooklet({
        id: booklet.id,
        input: {
          title: data.title.trim(),
          price: Number(data.price),
          gradeLevel: data.gradeLevel,
          groupId: data.groupId && data.groupId !== 'ALL' ? data.groupId : null,
          stockCount: data.stockCount !== null && data.stockCount !== undefined ? Number(data.stockCount) : null,
          isActive: data.isActive,
        },
      });

      toast.success('تم تحديث بيانات المذكرة بنجاح');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث المذكرة');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">تعديل المذكرة الدراسية</h2>
              <p className="text-xs text-slate-500">تعديل الاسم أو السعر أو المجموعات المستهدفة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <Label htmlFor="edit-title" className="text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-600" />
              عنوان المذكرة <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-title"
              {...register('title')}
              className="w-full text-right"
              autoFocus
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-price" className="text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                سعر المذكرة (ج.م) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-price"
                type="number"
                step="any"
                min="0"
                {...register('price', { valueAsNumber: true })}
                className="w-full text-right font-bold text-emerald-700"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>

            <div>
              <Label htmlFor="edit-stockCount" className="text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                المخزن المتاح
              </Label>
              <Input
                id="edit-stockCount"
                type="number"
                min="0"
                placeholder="غير محدود"
                {...register('stockCount', {
                  setValueAs: (v) => (v === '' || isNaN(v) ? null : Number(v)),
                })}
                className="w-full text-right"
              />
              {errors.stockCount && <p className="text-red-500 text-xs mt-1">{errors.stockCount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-gradeLevel" className="text-slate-700 font-medium mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                الصف الدراسي <span className="text-red-500">*</span>
              </Label>
              <select
                id="edit-gradeLevel"
                {...register('gradeLevel')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.gradeLevel && <p className="text-red-500 text-xs mt-1">{errors.gradeLevel.message}</p>}
            </div>

            <div>
              <Label htmlFor="edit-groupId" className="text-slate-700 font-medium mb-1.5">
                المجموعة المستهدفة
              </Label>
              <select
                id="edit-groupId"
                {...register('groupId')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value="">جميع مجموعات الصف</option>
                {filteredGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="edit-isActive"
              {...register('isActive')}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
            <Label htmlFor="edit-isActive" className="text-slate-700 text-sm font-medium cursor-pointer">
              إتاحة المذكرة للبيع والتحصيل عبر QR
            </Label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
              className="text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 shadow-sm shadow-purple-200"
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </div>
              ) : (
                'حفظ التعديلات'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
