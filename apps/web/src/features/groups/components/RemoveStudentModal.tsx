'use client';

import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useRemoveStudent } from '../hooks/useGroups';

interface RemoveStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  studentId: string;
  studentName: string;
}

export function RemoveStudentModal({ isOpen, onClose, groupId, studentId, studentName }: RemoveStudentModalProps) {
  const removeStudent = useRemoveStudent();

  if (!isOpen) return null;

  const handleConfirm = () => {
    removeStudent.mutate(
      { groupId, studentId },
      {
        onSuccess: () => {
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
          <div className="flex items-center text-red-600 font-bold">
            <AlertTriangle className="w-5 h-5 ml-2" />
            <h2>إزالة طالب من المجموعة</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {removeStudent.isError && (
            <Alert variant="error" className="mb-6">
              {(removeStudent.error as any)?.message || 'حدث خطأ أثناء إزالة الطالب. يرجى المحاولة مرة أخرى.'}
            </Alert>
          )}

          <div className="text-slate-700 text-base leading-relaxed">
            <p>هل أنت متأكد من رغبتك في إزالة الطالب <strong>"{studentName}"</strong> من هذه المجموعة؟</p>
            <p className="mt-2 text-sm text-slate-500">لن يتمكن الطالب من حضور حصص هذه المجموعة ولن تظهر له في التطبيق.</p>
          </div>

          <div className="mt-8 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={removeStudent.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirm}
              disabled={removeStudent.isPending}
            >
              {removeStudent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الإزالة...
                </>
              ) : (
                'تأكيد الإزالة'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
