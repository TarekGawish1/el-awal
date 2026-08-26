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
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    if (selectedGroupIds.length === groups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(groups.map((g: any) => g.id));
    }
  };

  const handleSave = async () => {
    try {
      await grantMutation.mutateAsync(selectedGroupIds);
      onClose();
    } catch {
      // Handled in mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">إدارة صلاحيات المجموعات الدراسية</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-right flex-1 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              اختر المجموعات المصرح لطلابها بمشاهدة هذا الكورس مجاناً وتلقائياً:
            </p>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-primary-600 hover:text-primary-700"
            >
              {selectedGroupIds.length === groups.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المجموعات'}
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
              لا توجد مجموعات دراسية مسجلة حالياً
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group: any) => {
                const isChecked = selectedGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleToggle(group.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-primary-50/60 border-primary-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
                          isChecked
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{group.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{group.gradeLevel}</span>
                          <span>•</span>
                          <span>{group.academicStage || 'عام'}</span>
                          {group._count?.enrollments !== undefined && (
                            <>
                              <span>•</span>
                              <span>{group._count.enrollments} طالب</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs text-slate-500 font-bold">
            تم تحديد {selectedGroupIds.length} مجموعة
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={grantMutation.isPending}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              {grantMutation.isPending ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
