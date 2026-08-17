'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useCreateGroup } from '../hooks/useGroups';
import { CreateGroupPayload } from '../types/groups.types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const [formData, setFormData] = useState<CreateGroupPayload>({
    name: '',
    gradeLevel: '',
    description: '',
    maxCapacity: 50,
    monthlyFee: 0,
  });
  
  const createGroup = useCreateGroup();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGroup.mutate(
      {
        ...formData,
        maxCapacity: formData.maxCapacity ? Number(formData.maxCapacity) : undefined,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : undefined,
      },
      {
        onSuccess: () => {
          setFormData({ name: '', gradeLevel: '', description: '', maxCapacity: 50, monthlyFee: 0 });
          onClose();
        },
      }
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">إنشاء مجموعة جديدة</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {createGroup.isError && (
            <Alert variant="error" className="mb-6">
              {(createGroup.error as any)?.message || 'حدث خطأ أثناء إنشاء المجموعة'}
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم المجموعة *</label>
              <Input
                required
                minLength={3}
                placeholder="مثال: مجموعة الأحد والأربعاء - الصف الثالث الثانوي"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={createGroup.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الصف الدراسي *</label>
              <Input
                required
                placeholder="مثال: الصف الثالث الثانوي"
                value={formData.gradeLevel}
                onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}
                disabled={createGroup.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">وصف المجموعة</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-y"
                placeholder="تفاصيل إضافية عن المجموعة..."
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                disabled={createGroup.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الحد الأقصى للطلاب</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="50"
                  value={formData.maxCapacity || ''}
                  onChange={e => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || undefined })}
                  disabled={createGroup.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المصروفات الشهرية</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  value={formData.monthlyFee === undefined ? '' : formData.monthlyFee}
                  onChange={e => setFormData({ ...formData, monthlyFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                  disabled={createGroup.isPending}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createGroup.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={createGroup.isPending || !formData.name || !formData.gradeLevel}
            >
              {createGroup.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء المجموعة'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
