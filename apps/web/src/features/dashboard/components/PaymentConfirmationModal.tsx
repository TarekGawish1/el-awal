'use client';

import React from 'react';
import { CheckCircle2, X, AlertCircle, Banknote, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAcceptReservation } from '@/features/groups';
import toast from 'react-hot-toast';

export interface PaymentConfirmationModalProps {
  reservationId: string;
  studentName: string;
  onClose: () => void;
}

export function PaymentConfirmationModal({ reservationId, studentName, onClose }: PaymentConfirmationModalProps) {
  const acceptMutation = useAcceptReservation();

  const executeAccept = (paymentStatus: 'PAID' | 'LATER') => {
    acceptMutation.mutate(
      { enrollmentId: reservationId, paymentStatus },
      {
        onSuccess: () => {
          toast.success(`تم قبول الطالب ${studentName} بنجاح ${paymentStatus === 'PAID' ? 'مع تسجيل الدفع' : 'مع تسجيل تأجيل الدفع'}`);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء قبول الطالب');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-primary-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-primary-900">تأكيد قبول الطالب</h3>
              <p className="text-xs text-primary-700">{studentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-primary-400 hover:text-primary-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <p>هل قام الطالب بدفع مصروفات الشهر الحالي عند حضوره؟ يرجى تحديد حالة الدفع لتسجيلها في النظام.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              className="h-24 flex flex-col items-center justify-center gap-2 bg-white border-2 border-green-500 text-green-700 hover:bg-green-50"
              variant="outline"
              onClick={() => executeAccept('PAID')}
              disabled={acceptMutation.isPending}
            >
              <Banknote className="w-8 h-8" />
              <span className="font-bold">نعم، دفع الآن</span>
            </Button>
            
            <Button 
              className="h-24 flex flex-col items-center justify-center gap-2 bg-white border-2 border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400"
              variant="outline"
              onClick={() => executeAccept('LATER')}
              disabled={acceptMutation.isPending}
            >
              <CalendarClock className="w-8 h-8" />
              <span className="font-bold">لا، سيدفع لاحقاً</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
