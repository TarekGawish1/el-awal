'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAddStudent, useSearchStudents } from '../hooks/useGroups';
import { Student } from '../types/groups.types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddStudentModal({ isOpen, onClose, groupId }: AddStudentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const { data: searchResults, isLoading: isSearching, isError: isSearchError } = useSearchStudents(debouncedQuery);
  const addStudent = useAddStudent();

  // Debounce search
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

  const handleSubmit = () => {
    if (!selectedStudent) return;
    
    addStudent.mutate(
      { 
        groupId, 
        payload: { studentId: selectedStudent.id } 
      },
      {
        onSuccess: () => {
          setSearchQuery('');
          setDebouncedQuery('');
          setSelectedStudent(null);
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
          <h2 className="text-xl font-bold text-slate-800">إضافة طالب للمجموعة</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col min-h-[400px]">
          {addStudent.isError && (
            <Alert variant="error" className="mb-4 shrink-0">
              {(addStudent.error as any)?.message || 'حدث خطأ أثناء إضافة الطالب. قد يكون الطالب مسجلاً بالفعل.'}
            </Alert>
          )}
          
          {isSearchError && (
            <Alert variant="error" className="mb-4 shrink-0">
              حدث خطأ أثناء البحث عن الطلاب.
            </Alert>
          )}

          <div className="mb-4 shrink-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">ابحث عن طالب</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                className="pr-10"
                placeholder="الاسم، رقم الهاتف، أو الكود..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={addStudent.isPending}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">اكتب حرفين على الأقل للبحث</p>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-md bg-slate-50">
            {isSearching ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p>جاري البحث...</p>
              </div>
            ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
              <div className="p-8 text-center text-slate-500">
                يرجى إدخال حرفين على الأقل للبحث
              </div>
            ) : searchResults?.data && searchResults.data.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {searchResults.data.map(student => (
                  <li 
                    key={student.id}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id 
                        ? 'bg-primary/5 border-l-4 border-l-primary' 
                        : 'hover:bg-slate-100 bg-white'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{student.user.name}</div>
                      <div className="text-xs text-slate-500 flex gap-3 mt-1">
                        <span>{student.code}</span>
                        <span dir="ltr">{student.user.phone}</span>
                      </div>
                    </div>
                    {selectedStudent?.id === student.id && (
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : debouncedQuery ? (
              <div className="p-8 text-center text-slate-500">
                لا توجد نتائج مطابقة لبحثك
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 h-full">
                <Search className="w-10 h-10 mb-2 opacity-50" />
                <p>ابدأ البحث لاختيار طالب</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3 justify-end shrink-0 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={addStudent.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addStudent.isPending || !selectedStudent}
            >
              {addStudent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 ml-2" />
                  إضافة الطالب
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
