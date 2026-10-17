export function getTemplateLabel(templateType: string) {
  switch (templateType) {
    case 'STUDENT_APPROVAL_CREDENTIALS':
    case 'STUDENT_REGISTRATION_CREDENTIALS':
      return { label: 'بيانات الحساب وتأكيد التسجيل', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ABSENCE_ALERT_PARENT':
      return { label: 'تنبيه غياب طالب', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'PAYMENT_RECEIVED_PARENT':
      return { label: 'إيصال سداد رسوم', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'TEACHER_DAILY_SCHEDULE':
      return { label: 'جدول الحصص الصباحي للمعلم', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'ONLINE_EXAM_REMINDER':
      return { label: 'تذكير بامتحان', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'HOMEWORK_MISSING_PARENT':
      return { label: 'تنبيه واجب مدرسي', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: templateType || 'إشعار واتساب عام', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

export function formatFailureReason(reason?: string | null) {
  if (!reason) return 'سبب غير محدد';
  if (reason.includes('not connected')) return 'خادم الواتساب غير متصل حالياً (انقطاع الاتصال)';
  if (reason.includes('not registered')) return 'هذا الرقم غير مسجل على تطبيق واتساب';
  if (reason.includes('timeout')) return 'مهلة الاتصال انتهت أثناء الإرسال';
  if (reason.includes('quota')) return 'تم بلوغ الحد الأقصى للإرسال مؤقتاً';
  return reason;
}
