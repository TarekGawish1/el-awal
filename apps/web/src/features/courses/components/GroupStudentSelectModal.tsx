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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">ضم طلاب من المجموعات الدراسية</h2>
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

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
            >
              <option value="">-- فلترة حسب المجموعة الحضورية --</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.gradeLevel})
                </option>
              ))}
            </select>

            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
            >
              <option value="">-- فلترة حسب الصف الدراسي --</option>
              <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
              <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
              <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
              <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
              <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
              <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الطالب، الهاتف، أو كود الطالب..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500 font-bold">
              تم العثور على {students.length} طالب • تم تحديد ({selectedStudentIds.length})
            </span>
            <div className="flex gap-3 text-primary-600 font-bold">
              <button type="button" onClick={handleSelectAll} className="hover:underline">
                تحديد الكل
              </button>
              <span>•</span>
              <button type="button" onClick={handleDeselectAll} className="hover:underline text-slate-500">
                إلغاء التحديد
              </button>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[350px] bg-white">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">لا يوجد طلاب مطابقين لخيارات البحث</p>
          ) : (
            students.map((student) => {
              const isAlreadyEnrolled = alreadyEnrolledStudentIds.includes(student.id);
              const isChecked = selectedStudentIds.includes(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => !isAlreadyEnrolled && handleToggleStudent(student.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isAlreadyEnrolled
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : isChecked
                      ? 'bg-primary-50/60 border-primary-300 cursor-pointer'
                      : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isAlreadyEnrolled
                          ? 'bg-slate-200 border-slate-300'
                          : isChecked
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {(isChecked || isAlreadyEnrolled) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {student.user?.fullName || (student as any).fullName || 'طالب'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                        <span>{student.studentCode}</span>
                        <span>•</span>
                        <span>{student.user?.phone || (student as any).phone || '—'}</span>
                        <span>•</span>
                        <span className="font-sans">{student.gradeLevel}</span>
                      </div>
                    </div>
                  </div>

                  {isAlreadyEnrolled && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      مشترك مسبقاً
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-bold text-slate-600">
            {selectedStudentIds.length} طالب سيتم اشتراكهم
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleBatchEnroll}
              disabled={enrollBatchMutation.isPending || selectedStudentIds.length === 0}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              {enrollBatchMutation.isPending
                ? 'جاري الضم...'
                : selectedStudentIds.length > 0
                ? `ضم الطلاب المحددين (${selectedStudentIds.length})`
                : 'ضم الطلاب المحددين'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
