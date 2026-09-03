'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Loader2, Search, UserPlus, QrCode, RefreshCcw, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Alert } from '@/components/ui/Alert';
import { useAddStudent, useSearchStudents } from '../hooks/useGroups';
import { Student } from '../types/groups.types';
import toast from 'react-hot-toast';

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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const { data: searchResults, isLoading: isSearching, isError: isSearchError } = useSearchStudents(debouncedQuery);
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
      } catch {
        toast.error(`فشل إضافة ${getStudentName(student)}`);
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
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 rounded-xl overflow-hidden p-6 border-2 border-primary-500/30 shadow-inner">
              <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary-500/50 bg-black relative">
                <Scanner
                  onScan={(detectedCodes) => {
                    if (detectedCodes && detectedCodes.length > 0 && detectedCodes[0]?.rawValue) {
                      setSearchQuery(detectedCodes[0].rawValue);
                      setIsScannerOpen(false);
                    }
                  }}
                  startTimeoutMs={30000}
                  formats={['qr_code']}
                  components={{}}
                  constraints={{ facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }}
                  styles={{
                    container: { width: '100%', height: '100%', position: 'relative' },
                    video: { width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' },
                  }}
                />
                <button type="button" onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')} className="absolute top-3 right-3 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2 rounded-full transition-colors">
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-300 mt-6 text-sm text-center font-medium">قم بتوجيه الكاميرا نحو رمز QR الخاص بالطالب</p>
              <Button variant="outline" size="sm" className="mt-4 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white" onClick={() => setIsScannerOpen(false)}>
                إلغاء المسح
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 min-h-[180px]">
              {isSearching ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p>جاري البحث...</p>
                </div>
              ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
                <div className="p-8 text-center text-slate-500">يرجى إدخال حرفين على الأقل للبحث</div>
              ) : searchResults?.data && searchResults.data.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {searchResults.data.map(student => {
                    const isSelected = selectedStudents.some(s => s.id === student.id);
                    return (
                      <li
                        key={student.id}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-all select-none ${isSelected ? 'bg-primary-50 border-r-4 border-r-primary-500' : 'hover:bg-slate-100 bg-white'}`}
                        onClick={() => toggleStudent(student)}
                      >
                        <div>
                          <div className={`font-semibold text-sm ${isSelected ? 'text-primary-800' : 'text-slate-800'}`}>
                            {getStudentName(student)}
                          </div>
                          <div className="text-xs text-slate-500 flex gap-3 mt-0.5">
                            <span>{getStudentCode(student)}</span>
                            <span dir="ltr">{(student as any).user?.phone || (student as any).phone || ''}</span>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300 bg-white'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : debouncedQuery ? (
                <div className="p-8 text-center text-slate-500">لا توجد نتائج مطابقة لبحثك</div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 h-full">
                  <Search className="w-10 h-10 mb-2 opacity-50" />
                  <p>ابدأ البحث لاختيار طالب أو أكثر</p>
                </div>
              )}
            </div>
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


