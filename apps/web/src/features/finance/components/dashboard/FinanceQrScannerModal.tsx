import { X, QrCode, CreditCard } from 'lucide-react';
import { FinanceQrScanner } from '../FinanceQrScanner';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToManual?: () => void;
  groupId?: string;
  groupName?: string;
  periodYear: number;
  periodMonth: number;
}

export function FinanceQrScannerModal({
  isOpen,
  onClose,
  onSwitchToManual,
  groupId,
  groupName,
  periodYear,
  periodMonth,
}: QrScannerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              الماسح السريع (QR)
            </h2>
            {groupName && (
              <p className="text-xs font-semibold text-primary-700 mt-0.5">
                المجموعة: {groupName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToManual && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToManual();
                }}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>رصد يدوي</span>
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <FinanceQrScanner 
            groupId={groupId} 
            periodYear={periodYear} 
            periodMonth={periodMonth}
          />
        </div>
      </div>
    </div>
  );
}
