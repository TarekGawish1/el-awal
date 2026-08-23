'use client';

import React, { useState } from 'react';
import { X, Users, Search, Check, Filter } from 'lucide-react';
import { useStudents } from '@/features/students/hooks/use-students';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useEnrollStudentsBatch } from '../hooks/useCourses';
import toast from 'react-hot-toast';

interface GroupStudentSelectModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  courseGradeLevel?: string;
  alreadyEnrolledStudentIds?: string[];
  onClose: () => void;
}

export function GroupStudentSelectModal({
  isOpen,
  courseId,
  courseTitle,
  courseGradeLevel,
  alreadyEnrolledStudentIds = [],
  onClose,
}: GroupStudentSelectModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>(courseGradeLevel || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const { data: groupsData } = useGroups();
  const groups = Array.isArray(groupsData) ? groupsData : (groupsData as any)?.data || [];

  const { data: studentsResponse, isLoading } = useStudents({
    search: searchTerm || undefined,
    groupId: selectedGroupId || undefined,
    gradeLevel: selectedGrade || undefined,
    limit: 100,
  });

  const students = studentsResponse?.data || [];
  const enrollBatchMutation = useEnrollStudentsBatch(courseId);

  if (!isOpen) return null;

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sId) => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectAll = () => {
    const unenrolled = students
      .filter((s) => !alreadyEnrolledStudentIds.includes(s.id))
      .map((s) => s.id);
    setSelectedStudentIds(unenrolled);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleBatchEnroll = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('يرجى تحديد طالب واحد على الأقل');
      return;
    }

    try {
      await enrollBatchMutation.mutateAsync(selectedStudentIds);
      onClose();
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">ضم طلاب من المجموعات الدراسية</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">المجموعة الدراسية</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">جميع المجموعات</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">الصف الدراسي</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">جميع الصفوف</option>
                <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو كود الطالب أو رقم الهاتف..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 dark:text-slate-400">
              تم تحديد <strong className="text-blue-600 dark:text-blue-400">{selectedStudentIds.length}</strong> طالب
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                تحديد الكل
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] font-bold text-slate-500 hover:underline"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        </div>

        {/* Students Checkbox List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">جاري تحميل قائمة الطلاب...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">لا يوجد طلاب مطابقين لمعايير التصفية</div>
          ) : (
            students.map((stu) => {
              const isEnrolled = alreadyEnrolledStudentIds.includes(stu.id);
              const isSelected = selectedStudentIds.includes(stu.id);

              const studentFullName = (stu as any).fullName || stu.user?.fullName || 'طالب';
              const studentGroupName = (stu as any).groupName || stu.groupEnrollments?.[0]?.group?.name || 'بدون مجموعة';

              return (
                <div
                  key={stu.id}
                  onClick={() => !isEnrolled && handleToggleStudent(stu.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${
                    isEnrolled
                      ? 'opacity-60 bg-slate-50 dark:bg-slate-950/40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 cursor-pointer'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                        isSelected || isEnrolled
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {(isSelected || isEnrolled) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{studentFullName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        كود: {stu.studentCode} • {stu.gradeLevel || 'غير محدد'}
                      </p>
                    </div>
                  </div>

                  {isEnrolled ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      مشترك بالفعل
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">{studentGroupName}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleBatchEnroll}
            disabled={enrollBatchMutation.isPending || selectedStudentIds.length === 0}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            {enrollBatchMutation.isPending
              ? 'جاري الضم...'
              : `ضم الطلاب المحددين (${selectedStudentIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
