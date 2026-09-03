import React, { useState } from 'react';
import {
  Shield,
  PlusCircle,
  Edit3,
  Trash2,
  QrCode,
  Banknote,
  CheckCircle2,
  Download,
  Info,
  ChevronRight,
  ChevronLeft,
  Eye,
  UserCheck,
  User,
} from 'lucide-react';
import { AuditLogItem, AuditAction } from '../types/audit.types';
import { AuditLogDetailModal } from './AuditLogDetailModal';

interface AuditLogsListProps {
  logs: AuditLogItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

const ACTION_CONFIGS: Record<
  AuditAction,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  CREATE: { label: 'إضافة', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: PlusCircle },
  UPDATE: { label: 'تعديل', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: Edit3 },
  DELETE: { label: 'حذف', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: Trash2 },
  SCAN_ATTENDANCE: { label: 'رصد حضور', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: QrCode },
  RECORD_PAYMENT: { label: 'دفع مالي', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Banknote },
  GRADE_SUBMISSION: { label: 'تصحيح درجات', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: CheckCircle2 },
  EXPORT: { label: 'تصدير', bg: 'bg-neutral-100 border-neutral-200', text: 'text-neutral-700', icon: Download },
  VIEW: { label: 'اطلاع', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', icon: Eye },
  LOGIN: { label: 'تسجيل دخول', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700', icon: UserCheck },
  STATUS_CHANGE: { label: 'تغيير حالة', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: Edit3 },
};

const ENTITY_LABELS: Record<string, { label: string; color: string }> = {
  STUDENT: { label: 'شؤون الطلاب', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  GROUP: { label: 'المجموعات الدراسية', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BOOKLET: { label: 'المذكرات والملازم', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  PAYMENT: { label: 'المدفوعات والمصروفات', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ATTENDANCE: { label: 'الحضور والغياب', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ASSISTANT: { label: 'المساعدين', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  COURSE: { label: 'الكورسات التعليمية', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  CONTENT: { label: 'الدروس والمحتوى', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  ASSESSMENT: { label: 'الواجبات والاختبارات', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  CERTIFICATE: { label: 'شهادات التقدير', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  SCHEDULE: { label: 'المواعيد والحصص', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  NOTIFICATION: { label: 'مركز الإشعارات', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  SETTING: { label: 'إعدادات النظام', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  AUTH: { label: 'جلسات الدخول', color: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
  CONTACT_MESSAGE: { label: 'رسائل الموقع', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  'CONTACT-MESSAGES': { label: 'رسائل الموقع', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  CONTACTMESSAGES: { label: 'رسائل الموقع', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  ACADEMIC_PERIOD: { label: 'الفترات الدراسية', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'ACADEMIC-PERIODS': { label: 'الفترات الدراسية', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACADEMICPERIODS: { label: 'الفترات الدراسية', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESERVATION: { label: 'طلبات الانضمام', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  RESERVATIONS: { label: 'طلبات الانضمام', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  STUDENT_GROUP: { label: 'المجموعات الدراسية', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'STUDENT-GROUPS': { label: 'المجموعات الدراسية', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function getEntityDisplay(type: string): { label: string; color: string } {
  const upper = (type || '').toUpperCase();
  const normalized = upper.replace(/[-_]/g, '');
  if (ENTITY_LABELS[upper]) return ENTITY_LABELS[upper];
  if (ENTITY_LABELS[normalized]) return ENTITY_LABELS[normalized];
  return { label: type === 'V1' || type === 'v1' ? 'إجراء عام' : type, color: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
}

export function formatAuditDescription(description: string): string {
  if (!description) return '';
  return description
    .replace(/CONTACT[-_]?MESSAGES?/gi, 'رسالة موقع')
    .replace(/ACADEMIC[-_]?PERIODS?/gi, 'فترة دراسية')
    .replace(/RESERVATIONS?/gi, 'طلب انضمام')
    .replace(/STUDENT[-_]?GROUPS?/gi, 'مجموعة دراسية')
    .replace(/QR/gi, 'الباركود');
}

export function AuditLogsList({ logs, meta, isLoading, onPageChange }: AuditLogsListProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center text-neutral-400 animate-pulse font-medium">
        جاري تحميل سجل النشاطات والعمليات...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-16 text-center">
        <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-800 mb-1">لا توجد عمليات مطابقة</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          لم يتم العثور على أي نشاطات مطابقة للفلاتر المحددة. جرب تغيير خيارات البحث أو التواريخ.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100 text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">الإجراء</th>
                <th className="px-6 py-4 font-bold">المنفّذ</th>
                <th className="px-6 py-4 font-bold">تفاصيل العملية</th>
                <th className="px-6 py-4 font-bold">القسم / الكيان</th>
                <th className="px-6 py-4 font-bold">التوقيت</th>
                <th className="px-6 py-4 font-bold text-center w-20">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => {
                const config = ACTION_CONFIGS[log.action] || ACTION_CONFIGS.UPDATE;
                const Icon = config.icon;
                const isAssistant = log.userRole === 'SECRETARIAT';
                const entity = getEntityDisplay(log.entityType);

                const timeStr = new Date(log.createdAt).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = new Date(log.createdAt).toLocaleDateString('ar-EG', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Action Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${config.bg} ${config.text}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    </td>

                    {/* Performer */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isAssistant
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-primary-100 text-primary-800'
                          }`}
                        >
                          {isAssistant ? 'م' : 'ع'}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-800 text-xs">{log.userName}</div>
                          <div className="text-[10px] text-neutral-400">
                            {isAssistant ? 'مساعد / سكرتارية' : 'المعلم'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-neutral-800 leading-relaxed line-clamp-2">
                        {formatAuditDescription(log.description)}
                      </div>
                    </td>

                    {/* Entity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${entity.color}`}>
                        {entity.label}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-neutral-700">{timeStr}</div>
                      <div className="text-[10px] text-neutral-400">{dateStr}</div>
                    </td>

                    {/* Action Button */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="عرض التفاصيل التقنية"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-xs">
            <div className="text-neutral-500">
              عرض الصفحة <span className="font-bold text-neutral-800">{meta.page}</span> من أصل{' '}
              <span className="font-bold text-neutral-800">{meta.totalPages}</span> ({meta.total} عملية)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={meta.page <= 1}
                onClick={() => onPageChange(meta.page - 1)}
                className="p-2 border border-neutral-200 rounded-lg bg-white text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange(meta.page + 1)}
                className="p-2 border border-neutral-200 rounded-lg bg-white text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
