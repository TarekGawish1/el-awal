'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { WhatsAppMessageLog } from '@/hooks/useWhatsAppQueue';
import { getTemplateLabel } from './whatsapp-queue.helpers';

interface WhatsAppQueuedMessageCardProps {
  message: WhatsAppMessageLog;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function WhatsAppQueuedMessageCard({
  message,
  isExpanded,
  onToggleExpand,
  onDelete,
  isDeleting,
}: WhatsAppQueuedMessageCardProps) {
  const tmpl = getTemplateLabel(message.templateType);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
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
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>
              موعد الإرسال المتوقع:{' '}
              <strong className="text-slate-600">
                {new Date(message.scheduledFor).toLocaleTimeString('ar-EG')}
              </strong>
            </span>
            <span>• أُضيفت: {new Date(message.createdAt).toLocaleTimeString('ar-EG')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>في الانتظار (Queued)</span>
          </span>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (typeof window !== 'undefined' && window.confirm('هل أنت متأكد من إزالة هذه الرسالة من طابور الانتظار؟')) {
                onDelete(message.id);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
            title="حذف الرسالة من الطابور"
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
            className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
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
