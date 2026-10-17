export interface ParsedError {
  type: 'auth' | 'booklet' | 'duplicate' | 'other';
  title: string;
  description: string;
}

export function parseConflictReason(reason: string, payload?: any): ParsedError {
  const r = reason ?? '';

  if (
    r.includes('Authentication required') ||
    r.includes('Unauthorized') ||
    r.includes('401') ||
    r.includes('انتهت صلاحية')
  ) {
    return {
      type: 'auth',
      title: 'انتهت صلاحية جلسة تسجيل الدخول أثناء المزامنة',
      description:
        'تم انتهاء الجلسة قبل اكتمال رفع البيانات. اضغط "إعادة المحاولة" لتحديث الجلسة ورفع العمليات تلقائياً.',
    };
  }

  if (
    r.includes('BOOKLET_GRADE_MISMATCH') ||
    r.includes('INVALID_BOOKLET_FOR_STUDENT') ||
    r.includes('غير مطابقة للمرحلة') ||
    r.includes('booklet') ||
    (payload?.paymentType === 'BOOKLET' && (r.includes('400') || r.includes('غير مخصصة')))
  ) {
    // Extract grade levels from the reason when present (e.g. "Grade A != Grade B")
    const match = r.match(/\(([^)]+)\s*!=\s*([^)]+)\)/);
    const bookletGrade = match?.[1]?.trim() ?? payload?.bookletGrade ?? '';
    const studentGrade = match?.[2]?.trim() ?? payload?.studentGrade ?? '';
    const details =
      bookletGrade && studentGrade
        ? `المذكرة مخصصة لـ "${bookletGrade}"، بينما الطالب في "${studentGrade}".`
        : 'المذكرة المختارة لا تتطابق مع الصف الدراسي للطالب.';

    return {
      type: 'booklet',
      title: 'تعارض في الصف الدراسي للمذكرة',
      description: details,
    };
  }

  if (
    r.includes('already registered') ||
    r.includes('مسجل مسبقاً') ||
    r.includes('Collision') ||
    r.includes('409')
  ) {
    return {
      type: 'duplicate',
      title: 'السجل موجود بالفعل على الخادم',
      description: 'هذه العملية مسجلة مسبقاً في قاعدة البيانات وتم تجاهل الإعادة.',
    };
  }

  // Strip internal prefixes before showing the user
  const cleaned = r
    .replace(/تجاوز الحد الأقصى للمحاولات \(3\):\s*/g, '')
    .replace(/تعذر إتمام العملية على الخادم:\s*/g, '');

  return {
    type: 'other',
    title: 'تعذر إتمام العملية',
    description: cleaned || r,
  };
}

export function domainLabel(domain: string): string {
  const map: Record<string, string> = {
    attendance: 'حضور وغياب',
    finance: 'سداد اشتراكات',
    students: 'تسجيل الطلاب',
    groups: 'المجموعات الدراسية',
    assessments: 'الاختبارات والواجبات',
  };
  return map[domain] ?? domain;
}
