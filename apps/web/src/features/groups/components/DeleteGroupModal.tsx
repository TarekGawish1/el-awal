'use client';

import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  groupName: string;
}

export function DeleteGroupModal({ isOpen, onClose, onConfirm, isDeleting, groupName }: DeleteGroupModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-error-600" />
            تأكيد الحذف
          </h2>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 mb-2">
            هل أنت متأكد من رغبتك في حذف المجموعة:
          </p>
          <p className="font-bold text-slate-800 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
            {groupName}
          </p>
          <div className="bg-error-50 text-error-800 p-3 rounded-lg text-sm border border-error-100">
            <strong>تنبيه خطير:</strong> لن تتمكن من التراجع عن هذا الإجراء، وسيتم إزالة جميع مواعيد المجموعة والطلاب المرتبطين بها بشكل نهائي.
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            تراجع
          </Button>
          <Button 
            variant="default" 
            className="bg-error-600 hover:bg-error-700 text-white border-none" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              'نعم، احذف المجموعة'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
