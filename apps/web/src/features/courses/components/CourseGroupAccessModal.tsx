'use client';

import React, { useState } from 'react';
import { X, Users, Check, ShieldCheck } from 'lucide-react';
import { useGrantGroupAccess } from '../hooks/useCourses';
import { useGroups } from '@/features/groups/hooks/useGroups';
import toast from 'react-hot-toast';

interface CourseGroupAccessModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  alreadyLinkedGroupIds?: string[];
  onClose: () => void;
}

export function CourseGroupAccessModal({
  isOpen,
  courseId,
  courseTitle,
  alreadyLinkedGroupIds = [],
  onClose,
}: CourseGroupAccessModalProps) {
  const { data: groupsData } = useGroups();
  const grantMutation = useGrantGroupAccess(courseId);

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(alreadyLinkedGroupIds);

  if (!isOpen) return null;

  const groups = Array.isArray(groupsData)
    ? groupsData
    : (groupsData as any)?.data || [];

  const handleToggle = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  const handleSave = async () => {
    if (selectedGroupIds.length === 0) {
      toast.error('يرجى اختيار مجموعة واحدة على الأقل');
      return;
    }

    try {
      await grantMutation.mutateAsync(selectedGroupIds);
      onClose();
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-white my-auto flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">منح صلاحية الوصول للكورس</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 text-right">
          <p className="text-xs text-slate-300">
            حدد المجموعات الدراسية (السناتر / الأوفلاين) التي ترغب في منح جميع طلابها المسجلين حق مشاهدة ودراسة هذا الكورس مجاناً وتلقائياً:
          </p>

          <div className="space-y-2 mt-3">
            {groups.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">لا توجد مجموعات دراسية مسجلة حالياً</p>
            ) : (
              groups.map((group: any) => {
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleToggle(group.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{group.name}</p>
                        <p className="text-[11px] text-slate-400">{group.gradeLevel || 'غير محدد'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{group._count?.enrollments || 0} طالب</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={grantMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50"
          >
            {grantMutation.isPending ? 'جاري التفعيل...' : 'تفعيل صلاحية المجموعات'}
          </button>
        </div>
      </div>
    </div>
  );
}
