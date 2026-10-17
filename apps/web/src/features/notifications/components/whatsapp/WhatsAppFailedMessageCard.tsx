'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { WhatsAppMessageLog } from '@/hooks/useWhatsAppQueue';
import { getTemplateLabel, formatFailureReason } from './whatsapp-queue.helpers';

interface WhatsAppFailedMessageCardProps {
  message: WhatsAppMessageLog;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isRetrying: boolean;
  isDeleting: boolean;
}

export function WhatsAppFailedMessageCard({
  message,
  isExpanded,
  onToggleExpand,
  onRetry,
  onDelete,
  isRetrying,
  isDeleting,
}: WhatsAppFailedMessageCardProps) {
  const tmpl = getTemplateLabel(message.templateType);

  return (
    <div className="bg-white rounded-2xl p-5 border border-red-100 hover:border-red-200 shadow-2xs space-y-3 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm text-slate-900">
              {message.recipientName || 'مستلم بدون اسم'}
            </span>
            <span
              className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
              dir="ltr"
            >
              +{message.recipientPhone}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${tmpl.color}`}>
              {tmpl.label}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
              الدور: {message.recipientRole === 'PARENT' ? 'ولي أمر' : message.recipientRole === 'STUDENT' ? 'طالب' : 'معلم'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-100">
              <AlertTriangle size={13} />
              <span>سبب الفشل: {formatFailureReason(message.failureReason)}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              • عدد المحاولات: {message.retryCount} / {message.maxRetries}
            </span>
            <span className="text-[11px] text-slate-400">
              • الوقت: {new Date(message.createdAt).toLocaleString('ar-EG')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => onRetry(message.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>إعادة الإرسال 🔄</span>
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (typeof window !== 'undefined' && window.confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) {
                onDelete(message.id);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
            title="حذف الرسالة من السجل"
          >
            <Trash2 size={13} />
            <span>حذف</span>
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[11px] text-slate-500">نص الرسالة:</span>
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-[11px] text-blue-600 font-bold hover:underline"
          >
            {isExpanded ? 'إخفاء النص ▲' : 'عرض نص الرسالة بالكامل ▼'}
          </button>
        </div>

        {isExpanded ? (
          <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto">
            {message.messageBody}
          </div>
        ) : (
          <p className="mt-1 line-clamp-1 text-slate-500 text-[11px]">
            {message.messageBody}
          </p>
        )}
      </div>
    </div>
  );
}
