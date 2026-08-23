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
  currentGroupAccess?: any[];
  alreadyLinkedGroupIds?: string[];
  onClose: () => void;
}

export function CourseGroupAccessModal({
  isOpen,
  courseId,
  courseTitle,
  currentGroupAccess = [],
  alreadyLinkedGroupIds = [],
  onClose,
}: CourseGroupAccessModalProps) {
  const { data: groupsData } = useGroups();
  const grantMutation = useGrantGroupAccess(courseId);

  const initialIds = alreadyLinkedGroupIds.length > 0
    ? alreadyLinkedGroupIds
    : currentGroupAccess.map((g: any) => (typeof g === 'string' ? g : g.groupId || g.id));

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialIds);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">منح صلاحية الوصول للكورس</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 text-right bg-white dark:bg-slate-900">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            حدد المجموعات الدراسية (السناتر / الأوفلاين) التي ترغب في منح جميع طلابها المسجلين حق مشاهدة ودراسة هذا الكورس مجاناً وتلقائياً:
          </p>

          <div className="space-y-2 mt-3">
            {groups.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد مجموعات دراسية مسجلة حالياً</p>
            ) : (
              groups.map((group: any) => {
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleToggle(group.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 dark:bg-emerald-950/40 dark:border-emerald-500/50 dark:text-white'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{group.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {group.gradeLevel} {group.academicStage ? `• ${group.academicStage}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {group._count?.enrollments || 0} طالب
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            تم تحديد {selectedGroupIds.length} مجموعة
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={grantMutation.isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
            >
              {grantMutation.isPending ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
