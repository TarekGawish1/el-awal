'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Loader2, Search, UserPlus, QrCode, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAddStudent, useSearchStudents, useGroupStudents } from '../hooks/useGroups';
import { Student } from '../types/groups.types';
import toast from 'react-hot-toast';
import { AddStudentScanner } from './add-student/AddStudentScanner';
import { AddStudentSearchResultsList } from './add-student/AddStudentSearchResultsList';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddStudentModal({ isOpen, onClose, groupId }: AddStudentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [transferConfirmId, setTransferConfirmId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching, isError: isSearchError } = useSearchStudents(debouncedQuery, { enabled: isOpen });
  const { data: existingStudents } = useGroupStudents(groupId, { enabled: isOpen });
  const existingIds = new Set((existingStudents || []).map((s: any) => s.id));
  const addStudent = useAddStudent();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setDebouncedQuery(searchQuery);
      } else {
        setDebouncedQuery('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const toggleStudent = (student: Student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) return prev.filter(s => s.id !== student.id);
      return [...prev, student];
    });
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const getStudentName = (student: any) =>
    student.fullName || student.user?.fullName || student.user?.name || 'طالب';

  const getStudentCode = (student: any) =>
    student.studentCode || student.code || '';

  // Returns the first ACTIVE enrollment in a DIFFERENT group (the "one active group"
  // rule), or null when the student is free to join / already in this group.
  const getOtherGroup = (student: any): { id: string; name: string } | null => {
    const enrollments = student?.groupEnrollments;
    if (!Array.isArray(enrollments)) return null;
    const other = enrollments.find(
      (e: any) => e?.group?.id && e.group.id !== groupId && (!e.status || e.status === 'ACTIVE'),
    );
    return other?.group || null;
  };

  const handleTransfer = async (student: Student) => {
    setTransferringId(student.id);
    try {
      await new Promise<void>((resolve, reject) => {
        addStudent.mutate(
          { groupId, payload: { studentId: student.id, transfer: true } },
          { onSuccess: () => resolve(), onError: (e) => reject(e) },
        );
      });
      toast.success(`تم نقل ${getStudentName(student)} لهذه المجموعة`);
      setSelectedStudents(prev => prev.filter(s => s.id !== student.id));
    } catch (e: any) {
      toast.error(e?.message || `فشل نقل ${getStudentName(student)}`);
    } finally {
      setTransferringId(null);
      setTransferConfirmId(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) return;
    setIsSubmitting(true);
    setProgress({ done: 0, total: selectedStudents.length });

    let successCount = 0;
    for (const student of selectedStudents) {
      try {
        await new Promise<void>((resolve, reject) => {
          addStudent.mutate(
            { groupId, payload: { studentId: student.id } },
            { onSuccess: () => resolve(), onError: (e) => reject(e) }
          );
        });
        successCount++;
        setProgress(p => ({ ...p, done: p.done + 1 }));
      } catch (e: any) {
        toast.error(e?.message || `فشل إضافة ${getStudentName(student)}`);
        setProgress(p => ({ ...p, done: p.done + 1 }));
      }
    }

    setIsSubmitting(false);
    if (successCount > 0) toast.success(`تم إضافة ${successCount} طالب بنجاح`);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedStudents([]);
    setIsScannerOpen(false);
    setIsSubmitting(false);
    setTransferConfirmId(null);
    setTransferringId(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-800">إضافة طلاب للمجموعة</h2>
            {selectedStudents.length > 0 && (
              <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {selectedStudents.length}
              </span>
            )}
          </div>
          <button onClick={handleClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {isSearchError && (
            <Alert variant="error" className="shrink-0">حدث خطأ أثناء البحث عن الطلاب.</Alert>
          )}

          {/* Search Input */}
          <div className="shrink-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">ابحث عن طالب</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                className="pr-10 pl-12"
                placeholder="الاسم، رقم الهاتف، أو الكود..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={isSubmitting || isScannerOpen}
              />
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center gap-0.5">
                {/* Clear button - shows when there's text */}
                {searchQuery && !isScannerOpen && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="مسح البحث"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {/* QR scanner button */}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(!isScannerOpen)}
                  className={`p-1.5 rounded-md transition-colors ${isScannerOpen ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'}`}
                  title="مسح QR Code"
                >
                  <QrCode className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">اكتب حرفين على الأقل — يمكنك اختيار أكثر من طالب</p>
          </div>

          {/* Selected Students Chips */}
          {selectedStudents.length > 0 && (
            <div className="shrink-0">
              <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                الطلاب المحددون ({selectedStudents.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map(student => (
                  <div key={student.id} className="flex items-center gap-1.5 bg-primary-50 border border-primary-200 text-primary-800 text-xs font-semibold px-2.5 py-1.5 rounded-full">
                    <span>{getStudentName(student)}</span>
                    <button type="button" onClick={() => removeStudent(student.id)} disabled={isSubmitting} className="text-primary-400 hover:text-primary-700 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanner or Results */}
          {isScannerOpen ? (
            <AddStudentScanner
              onScan={(code) => {
                setSearchQuery(code);
                setIsScannerOpen(false);
              }}
              onClose={() => setIsScannerOpen(false)}
            />
          ) : (
            <AddStudentSearchResultsList
              searchResults={searchResults}
              isSearching={isSearching}
              searchQuery={searchQuery}
              debouncedQuery={debouncedQuery}
              existingIds={existingIds}
              selectedStudents={selectedStudents}
              transferConfirmId={transferConfirmId}
              transferringId={transferringId}
              onToggleStudent={toggleStudent}
              onTransfer={handleTransfer}
              onSetTransferConfirmId={setTransferConfirmId}
              getStudentName={getStudentName}
              getStudentCode={getStudentCode}
              getOtherGroup={getOtherGroup}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-between items-center border-t border-slate-100 pt-4 shrink-0">
          <Link href="/teacher/students" onClick={handleClose} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center transition-colors hover:bg-primary-50 px-3 py-2 rounded-lg">
            <UserPlus className="w-4 h-4 ml-2" />
            تسجيل طالب جديد
          </Link>
          <div className="flex gap-3 items-center">
            {isSubmitting && (
              <span className="text-xs text-slate-500 font-medium">{progress.done} / {progress.total}</span>
            )}
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || selectedStudents.length === 0}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإضافة...</>
              ) : (
                <><UserPlus className="w-4 h-4 ml-2" />إضافة {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
