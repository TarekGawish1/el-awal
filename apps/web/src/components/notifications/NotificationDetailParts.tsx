'use client';

import React from 'react';
import {
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  CreditCard,
  MessageSquare,
  Bell,
  Copy,
  Check,
} from 'lucide-react';

export const typeConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  STUDENT_APPROVAL_CREDENTIALS: {
    label: 'بيانات القبول والدخول',
    icon: <ShieldCheck size={20} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  STUDENT_REGISTRATION_CREDENTIALS: {
    label: 'بيانات التسجيل والحساب',
    icon: <KeyRound size={20} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  ABSENCE_ALERT_PARENT: {
    label: 'تنبيه غياب',
    icon: <AlertTriangle size={20} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  STUDENT_ABSENCE: {
    label: 'تسجيل غياب',
    icon: <AlertTriangle size={20} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  EXAM_FAILED_ALERT_PARENT: {
    label: 'تنبيه درجات',
    icon: <AlertTriangle size={20} />,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  ASSESSMENT_GRADED: {
    label: 'تصحيح تقييم',
    icon: <ClipboardList size={20} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  NEW_HOMEWORK_ASSIGNED: {
    label: 'واجب جديد',
    icon: <ClipboardList size={20} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  NEW_EXAM_PUBLISHED: {
    label: 'امتحان جديد',
    icon: <ClipboardList size={20} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  SESSION_REMINDER_STUDENT: {
    label: 'تذكير بالحصة',
    icon: <Calendar size={20} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_SESSION_REMINDER: {
    label: 'تذكير بموعد الحصة',
    icon: <Calendar size={20} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_DAILY_SCHEDULE: {
    label: 'جدول اليوم',
    icon: <BookOpen size={20} />,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  PAYMENT_RECEIVED: {
    label: 'تأكيد دفع',
    icon: <CreditCard size={20} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  GENERAL_ANNOUNCEMENT: {
    label: 'إعلان عام',
    icon: <Bell size={20} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  default: {
    label: 'إشعار',
    icon: <MessageSquare size={20} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
};

export function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formats notification text: detects URLs and makes them clickable,
 * renders markdown backticks (`...`) as code, and *bold* text.
 */
export function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-slate-800 leading-relaxed text-sm select-text">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-2" />;
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = line.split(urlRegex);

        return (
          <p key={lineIdx} className="break-words">
            {parts.map((part, partIdx) => {
              if (part.match(/^https?:\/\//)) {
                return (
                  <a
                    key={partIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium mx-1 break-all"
                  >
                    <span>{part}</span>
                    <ExternalLink size={12} className="inline flex-shrink-0" />
                  </a>
                );
              }

              if (part.includes('`')) {
                const codeParts = part.split(/(`[^`]+`)/g);
                return (
                  <React.Fragment key={partIdx}>
                    {codeParts.map((cPart, cIdx) => {
                      if (cPart.startsWith('`') && cPart.endsWith('`')) {
                        const codeVal = cPart.slice(1, -1);
                        return (
                          <code
                            key={cIdx}
                            className="bg-slate-100 text-blue-700 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-200 select-all"
                          >
                            {codeVal}
                          </code>
                        );
                      }
                      return cPart;
                    })}
                  </React.Fragment>
                );
              }

              return <React.Fragment key={partIdx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

interface NotificationCredentialsCardProps {
  studentPhone?: string;
  studentPass?: string;
  parentPass?: string;
  copiedKey: string | null;
  onCopyValue: (value: string, keyName: string) => void;
}

export function NotificationCredentialsCard({
  studentPhone,
  studentPass,
  parentPass,
  copiedKey,
  onCopyValue,
}: NotificationCredentialsCardProps) {
  if (!studentPhone && !studentPass && !parentPass) return null;

  return (
    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/80 space-y-2.5">
      <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold mb-1">
        <KeyRound size={14} />
        <span>بيانات الدخول السريع:</span>
      </div>

      {studentPhone && (
        <div className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
          <span className="text-slate-500">رقم الهاتف / المستخدم:</span>
          <div className="flex items-center gap-2">
            <code className="font-mono font-semibold text-slate-800">{studentPhone}</code>
            <button
              onClick={() => onCopyValue(studentPhone, 'رقم الهاتف')}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
              title="نسخ"
            >
              {copiedKey === 'رقم الهاتف' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}

      {studentPass && (
        <div className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
          <span className="text-slate-500">كلمة مرور الطالب:</span>
          <div className="flex items-center gap-2">
            <code className="font-mono font-semibold text-slate-800">{studentPass}</code>
            <button
              onClick={() => onCopyValue(studentPass, 'كلمة مرور الطالب')}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
              title="نسخ"
            >
              {copiedKey === 'كلمة مرور الطالب' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}

      {parentPass && (
        <div className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
          <span className="text-slate-500">كلمة مرور ولي الأمر:</span>
          <div className="flex items-center gap-2">
            <code className="font-mono font-semibold text-slate-800">{parentPass}</code>
            <button
              onClick={() => onCopyValue(parentPass, 'كلمة مرور ولي الأمر')}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
              title="نسخ"
            >
              {copiedKey === 'كلمة مرور ولي الأمر' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
