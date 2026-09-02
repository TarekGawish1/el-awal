import React from 'react';
import { X, Clock, User, Shield, Globe, Layers } from 'lucide-react';
import { AuditLogItem } from '../types/audit.types';

const ENTITY_LABELS: Record<string, string> = {
  STUDENT: 'شؤون الطلاب',
  GROUP: 'المجموعات الدراسية',
  BOOKLET: 'المذكرات والملازم',
  PAYMENT: 'المدفوعات والمصروفات',
  ATTENDANCE: 'الحضور والغياب',
  ASSISTANT: 'المساعدين',
  COURSE: 'الكورسات التعليمية',
  CONTENT: 'الدروس والمحتوى',
  ASSESSMENT: 'الواجبات والاختبارات',
  CERTIFICATE: 'شهادات التقدير',
  SCHEDULE: 'المواعيد والحصص',
  NOTIFICATION: 'مركز الإشعارات',
  SETTING: 'إعدادات النظام',
  AUTH: 'جلسات الدخول',
  SYSTEM: 'النظام العام',
};

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  if (!log) return null;

  const formattedDate = new Date(log.createdAt).toLocaleString('ar-EG', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-800">تفاصيل العملية المسجلة</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Summary Box */}
          <div className="p-4 bg-primary-50/60 border border-primary-100 rounded-2xl">
            <p className="font-bold text-primary-950 text-base leading-relaxed">{log.description}</p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="flex items-center gap-2 text-neutral-500 mb-1 text-xs font-bold">
                <User className="w-4 h-4 text-primary-500" />
                منفّذ العملية
              </div>
              <div className="font-bold text-neutral-800">{log.userName}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {log.userRole === 'TEACHER' ? 'المعلم الرئيسي' : 'مساعد / سكرتارية'}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="flex items-center gap-2 text-neutral-500 mb-1 text-xs font-bold">
                <Clock className="w-4 h-4 text-primary-500" />
                توقيت العملية
              </div>
              <div className="font-bold text-neutral-800">{formattedDate}</div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="flex items-center gap-2 text-neutral-500 mb-1 text-xs font-bold">
                <Layers className="w-4 h-4 text-primary-500" />
                القسم / الكيان
              </div>
              <div className="font-bold text-neutral-800">
                {log.entityName || (ENTITY_LABELS[log.entityType.toUpperCase()] || (log.entityType === 'V1' ? 'إجراء عام' : log.entityType))}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                النوع: {ENTITY_LABELS[log.entityType.toUpperCase()] || (log.entityType === 'V1' ? 'إجراء عام' : log.entityType)}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="flex items-center gap-2 text-neutral-500 mb-1 text-xs font-bold">
                <Globe className="w-4 h-4 text-primary-500" />
                عنوان الشبكة (IP)
              </div>
              <div className="font-mono text-xs font-bold text-neutral-800" dir="ltr">
                {log.ipAddress || 'غير متوفر'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-bold rounded-xl text-sm transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
