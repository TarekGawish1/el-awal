'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const defaultTitle =
    variant === 'danger'
      ? 'تأكيد الحذف'
      : variant === 'warning'
      ? 'تنبيه تأكيد'
      : 'تأكيد العملية';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              {variant === 'danger' ? (
                <Trash2 className="w-5 h-5" />
              ) : variant === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">
              {title || defaultTitle}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Content */}
        <div className="p-6 text-center sm:text-right space-y-3">
          <p className="text-sm font-semibold text-slate-700 leading-relaxed">
            {message}
          </p>
          {variant === 'danger' && (
            <p className="text-xs text-rose-600 font-medium">
              ⚠️ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه بعد الحذف.
            </p>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl px-4 text-xs font-bold"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-xl px-5 text-xs font-bold shadow-xs ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isLoading ? 'جاري التنفيذ...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
