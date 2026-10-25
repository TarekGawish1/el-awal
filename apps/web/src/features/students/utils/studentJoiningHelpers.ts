/**
 * Utility helpers for formatting student joining and registration history.
 */

export interface JoiningMethodInfo {
  type: 'GROUP_LINK' | 'MANUAL' | 'DIRECT' | 'SYSTEM';
  label: string;
  shortLabel: string;
  description: string;
  groupName?: string | null;
  authorName?: string | null;
  isGroupLink: boolean;
}

/**
 * Formats a Date/string into Arabic date: e.g. "25 أكتوبر 2026"
 */
export function formatJoiningDate(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a Date/string into Arabic 12-hour time: e.g. "10:30 ص"
 */
export function formatJoiningTime(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats full Date & Time in Arabic: e.g. "25 أكتوبر 2026 • 10:30 ص"
 */
export function formatJoiningDateTime(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const dateStr = formatJoiningDate(d);
  const timeStr = formatJoiningTime(d);
  return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
}

/**
 * Returns a user-friendly Arabic relative time label (e.g. "منذ 5 دقائق", "اليوم في 10:30 ص", "أمس", etc.)
 */
export function getJoiningRelativeTime(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffHours < 24) {
    const timeStr = formatJoiningTime(d);
    return `اليوم ${timeStr}`;
  }
  if (diffDays === 1) {
    const timeStr = formatJoiningTime(d);
    return `أمس ${timeStr}`;
  }
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return formatJoiningDate(d);
}

/**
 * Inspects student creation metadata and resolves the join method.
 */
export function resolveJoiningMethod(student: {
  createdByName?: string | null;
  groupEnrollments?: Array<{ group?: { name?: string } }>;
}): JoiningMethodInfo {
  const creator = student.createdByName?.trim() || '';

  if (creator.includes('رابط') || creator.includes('رابط انضمام')) {
    const groupName = creator.replace(/^رابط\s*انضمام\s*[:\-]?\s*/i, '').trim();
    return {
      type: 'GROUP_LINK',
      label: 'انضمام عبر رابط المجموعة',
      shortLabel: 'رابط المجموعة',
      description: groupName ? `انضمام ذاتي لمجموعة "${groupName}"` : 'انضمام عبر رابط المجموعة المباشر',
      groupName: groupName || student.groupEnrollments?.[0]?.group?.name || null,
      authorName: null,
      isGroupLink: true,
    };
  }

  if (creator) {
    return {
      type: 'MANUAL',
      label: `تسجيل يدوي بواسطة ${creator}`,
      shortLabel: 'تسجيل يدوي',
      description: `تم التسجيل والإضافة بواسطة: ${creator}`,
      groupName: student.groupEnrollments?.[0]?.group?.name || null,
      authorName: creator,
      isGroupLink: false,
    };
  }

  return {
    type: 'DIRECT',
    label: 'تسجيل مباشر عبر المنصة',
    shortLabel: 'تسجيل مباشر',
    description: 'تم إنشاء الحساب والتسجيل ذاتياً عبر المنصة',
    groupName: student.groupEnrollments?.[0]?.group?.name || null,
    authorName: null,
    isGroupLink: false,
  };
}
