/**
 * Utility helpers for formatting student joining and registration history.
 */

export interface JoiningMethodInfo {
  type: 'GROUP_LINK' | 'MANUAL' | 'DIRECT' | 'APPROVED_REQUEST' | 'SYSTEM';
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
  enrollments?: Array<{ group?: { name?: string } }>;
}): JoiningMethodInfo {
  const creator = student.createdByName?.trim() || '';
  const allEnrollments = student.groupEnrollments || student.enrollments || [];
  const firstGroupName = allEnrollments[0]?.group?.name;

  // 1. Approved join request tag (e.g. "طلب انضمام معتمد: مجموعة النخبة")
  if (
    creator.includes('طلب انضمام') ||
    creator.includes('طلب انضمام معتمد') ||
    creator.includes('حجز معتمد')
  ) {
    const groupName = creator.replace(/^(طلب\s*انضمام\s*(معتمد)?|حجز\s*معتمد)\s*[:\-]?\s*/i, '').trim();
    const effectiveGroupName = groupName || firstGroupName || null;
    return {
      type: 'APPROVED_REQUEST',
      label: 'طلب انضمام معتمد',
      shortLabel: 'طلب انضمام معتمد',
      description: effectiveGroupName
        ? `طلب انضمام معتمد لمجموعة "${effectiveGroupName}"`
        : 'طلب انضمام معتمد من المعلم',
      groupName: effectiveGroupName,
      authorName: null,
      isGroupLink: false,
    };
  }

  // 2. Explicit group link tag in createdByName (e.g. "رابط انضمام: مجموعة النخبة")
  if (creator.includes('رابط') || creator.includes('رابط انضمام')) {
    const groupName = creator.replace(/^رابط\s*انضمام\s*[:\-]?\s*/i, '').trim();
    const effectiveGroupName = groupName || firstGroupName || null;
    return {
      type: 'GROUP_LINK',
      label: 'انضمام عبر رابط المجموعة',
      shortLabel: 'رابط المجموعة',
      description: effectiveGroupName
        ? `انضمام ذاتي لمجموعة "${effectiveGroupName}"`
        : 'انضمام عبر رابط المجموعة المباشر',
      groupName: effectiveGroupName,
      authorName: null,
      isGroupLink: true,
    };
  }

  // 2. Explicit creator name (teacher / assistant / secretariat)
  if (creator) {
    return {
      type: 'MANUAL',
      label: `تسجيل يدوي بواسطة ${creator}`,
      shortLabel: 'تسجيل يدوي',
      description: `تم التسجيل والإضافة بواسطة: ${creator}`,
      groupName: firstGroupName || null,
      authorName: creator,
      isGroupLink: false,
    };
  }

  // 3. Historical group link registrations:
  // When students join via group links, they are enrolled in the group at the moment of registration.
  // In older records where createdByName wasn't explicitly populated, having a group enrollment means
  // they joined via that group's join link.
  if (firstGroupName) {
    return {
      type: 'GROUP_LINK',
      label: 'انضمام عبر رابط المجموعة',
      shortLabel: 'رابط المجموعة',
      description: `انضمام ذاتي لمجموعة "${firstGroupName}"`,
      groupName: firstGroupName,
      authorName: null,
      isGroupLink: true,
    };
  }

  // 4. Default fallback: completely unassigned student who self-registered on the portal without any group
  return {
    type: 'DIRECT',
    label: 'تسجيل مباشر عبر المنصة',
    shortLabel: 'تسجيل مباشر',
    description: 'تم إنشاء الحساب والتسجيل ذاتياً عبر المنصة',
    groupName: null,
    authorName: null,
    isGroupLink: false,
  };
}
