import React from 'react';
import {
  Phone,
  CheckCircle,
  Trash2,
  Clock,
  MessageCircle,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { ContactMessage } from '../hooks/useTeacherInquiries';

interface InquiryCardProps {
  message: ContactMessage;
  onMarkAsRead: (id: string) => void;
  isMarkingRead: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function InquiryCard({
  message: msg,
  onMarkAsRead,
  isMarkingRead,
  onDelete,
  isDeleting,
}: InquiryCardProps) {
  const getWhatsAppUrl = (phone: string, name: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '2' + clean;
    else if (!clean.startsWith('20') && clean.length === 10) clean = '20' + clean;
    const text = encodeURIComponent(`مرحباً أستاذ ${name}، بخصوص استفسارك على منصة الأول:`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  return (
    <div
      className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
        !msg.isRead
          ? 'border-primary-300 ring-2 ring-primary-500/10 bg-gradient-to-r from-primary-50/20 to-white'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              !msg.isRead ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {msg.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">{msg.name}</h3>
              {!msg.isRead ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                  جديد
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium inline-flex items-center gap-1">
                  <CheckCheck className="w-3 h-3 text-slate-400" />
                  تمت المراجعة
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span dir="ltr">
                  {new Date(msg.createdAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Direct Action Contacts */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <a
            href={`tel:${msg.phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="اتصال هاتفي"
          >
            <Phone className="w-3.5 h-3.5 text-slate-600" />
            <span dir="ltr">{msg.phone}</span>
          </a>

          <a
            href={getWhatsAppUrl(msg.phone, msg.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            title="تواصل واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>واتساب</span>
          </a>
        </div>
      </div>

      {/* Message Body */}
      <div className="mt-4 p-4 bg-slate-50/80 rounded-xl text-slate-800 text-sm sm:text-base leading-relaxed border border-slate-100">
        <p className="whitespace-pre-line">{msg.message}</p>
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-3 text-xs">
        <div>
          {!msg.isRead && (
            <button
              type="button"
              disabled={isMarkingRead}
              onClick={() => onMarkAsRead(msg.id)}
              className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-bold hover:underline cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              تحديد كمقروء
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(msg.id)}
            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            حذف الرسالة
          </button>
        </div>
      </div>
    </div>
  );
}
