/**
 * Converts any time string (HH:MM 24h or HH:MM AM/PM 12h) to Arabic 12-hour format (e.g. 05:00 م).
 */
export function formatArabicTime12H(timeStr?: string | null): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();

  // If already in Arabic format, normalize
  if (clean.includes('ص') || clean.includes('م')) return clean;

  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) return clean;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;

  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mStr = m < 10 ? `0${m}` : `${m}`;

  return `${h12}:${mStr} ${period}`;
}

/**
 * Returns formatted 12-hour Arabic time range e.g. "05:00 م - 07:30 م"
 */
export function formatArabicTimeRange12H(
  startTime?: string | null,
  endTime?: string | null,
): string {
  const start = formatArabicTime12H(startTime);
  const end = formatArabicTime12H(endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

/**
 * Returns a compact formatted Arabic time range for constrained cards/pills:
 * e.g. "05:00 - 07:30 م" (omits repeated period if same meridian) or "05:00 م"
 */
export function formatArabicTimeRangeCompact(
  startTime?: string | null,
  endTime?: string | null,
): string {
  const start = formatArabicTime12H(startTime);
  const end = formatArabicTime12H(endTime);

  if (!start && !end) return '';
  if (start && !end) return start;
  if (!start && end) return end;

  // Extract periods
  const startPeriod = start.includes('م') ? 'م' : start.includes('ص') ? 'ص' : null;
  const endPeriod = end.includes('م') ? 'م' : end.includes('ص') ? 'ص' : null;

  if (startPeriod && endPeriod && startPeriod === endPeriod) {
    // Strip period from start: "05:00 م" -> "05:00"
    const startClean = start.replace(/\s*(م|ص)/, '').trim();
    return `${startClean} - ${end}`;
  }

  return `${start} - ${end}`;
}

/**
 * Parses time string to total minutes from midnight for calendar position calculations.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();

  // Check Arabic format (e.g. 05:00 م)
  if (clean.includes('م') || clean.includes('ص')) {
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(م|ص)?/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const isPM = match[3] === 'م';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }

  // Check standard 24h or AM/PM format
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;

  return h * 60 + m;
}

/**
 * Checks whether two time intervals [startA, endA) and [startB, endB) overlap in time.
 * If end time is omitted or <= start time, defaults to a standard 90-minute session duration.
 */
export function doTimeIntervalsOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null,
): boolean {
  const sA = parseTimeToMinutes(startA);
  const sB = parseTimeToMinutes(startB);
  if (sA === null || sB === null) return false;

  let eA = parseTimeToMinutes(endA);
  let eB = parseTimeToMinutes(endB);
  if (eA === null || eA <= sA) eA = sA + 90;
  if (eB === null || eB <= sB) eB = sB + 90;

  return sA < eB && sB < eA;
}

export interface MinimalSessionLike {
  id?: string;
  sessionDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  topic?: string | null;
  isCancelled?: boolean | null;
  group?: {
    name?: string | null;
    gradeLevel?: string | null;
  } | null;
}

/**
 * Finds any existing active (non-cancelled) session on targetDate that overlaps with target time range.
 */
export function findSessionConflict<T extends MinimalSessionLike>(
  sessions: T[],
  targetDateStr: string,
  targetStartTime?: string | null,
  targetEndTime?: string | null,
  excludeSessionId?: string,
): T | null {
  if (!targetDateStr || !targetStartTime) return null;

  for (const session of sessions) {
    if (excludeSessionId && session.id === excludeSessionId) continue;
    if (session.isCancelled) continue;

    const sDateStr = toLocalDateStr(session.sessionDate);
    if (sDateStr !== targetDateStr) continue;

    if (doTimeIntervalsOverlap(targetStartTime, targetEndTime, session.startTime, session.endTime)) {
      return session;
    }
  }

  return null;
}

export interface OverlappingLayoutInfo {
  colIndex: number;
  colCount: number;
  hasConflict: boolean;
}

/**
 * Calculates side-by-side layout columns for a list of sessions on a single day.
 * Avoids visual collision/overlay by assigning non-conflicting track indexes to concurrent sessions.
 */
export function calculateOverlappingColumns<T extends MinimalSessionLike>(
  daySessions: T[],
): Map<string, OverlappingLayoutInfo> {
  const result = new Map<string, OverlappingLayoutInfo>();
  if (daySessions.length === 0) return result;

  // Compute minute intervals
  const items = daySessions.map((s, idx) => {
    const sMin = parseTimeToMinutes(s.startTime) ?? 16 * 60;
    let eMin = parseTimeToMinutes(s.endTime);
    if (!eMin || eMin <= sMin) eMin = sMin + 90;
    return {
      session: s,
      id: s.id || `idx_${idx}`,
      start: sMin,
      end: eMin,
      isCancelled: !!s.isCancelled,
    };
  });

  // Sort primarily by start time, then by duration descending
  items.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });

  // Group into connected overlap clusters
  const clusters: Array<typeof items> = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.end;
    } else if (item.start < clusterEnd) {
      // Overlaps with the current cluster
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      // New disjoint cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  for (const cluster of clusters) {
    const tracks: number[] = []; // tracks[col] = end time of last session placed in that track
    const clusterPlacements = new Map<string, number>();

    for (const item of cluster) {
      let placedCol = -1;
      for (let col = 0; col < tracks.length; col++) {
        if (tracks[col] <= item.start) {
          placedCol = col;
          tracks[col] = item.end;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = tracks.length;
        tracks.push(item.end);
      }
      clusterPlacements.set(item.id, placedCol);
    }

    const totalCols = Math.max(1, tracks.length);
    const activeItemsInCluster = cluster.filter((c) => !c.isCancelled);
    const clusterHasConflict = totalCols > 1 && activeItemsInCluster.length > 1;

    for (const item of cluster) {
      const colIndex = clusterPlacements.get(item.id) ?? 0;
      result.set(item.id, {
        colIndex,
        colCount: totalCols,
        hasConflict: clusterHasConflict && !item.isCancelled,
      });
    }
  }

  return result;
}

export interface GradeTheme {
  bg: string;
  badge: string;
  dot: string;
  iconColor: string;
  borderColor: string;
}

export const GRADE_THEMES: Record<string, GradeTheme> = {
  'الصف الثالث الثانوي': {
    bg: 'bg-indigo-100/95 hover:bg-indigo-200/95 text-indigo-950 border-indigo-300/80 shadow-indigo-900/5',
    badge: 'bg-indigo-200 text-indigo-950',
    dot: 'bg-indigo-600',
    iconColor: 'text-indigo-700',
    borderColor: 'border-indigo-400',
  },
  'الصف الثاني الثانوي': {
    bg: 'bg-purple-100/95 hover:bg-purple-200/95 text-purple-950 border-purple-300/80 shadow-purple-900/5',
    badge: 'bg-purple-200 text-purple-950',
    dot: 'bg-purple-600',
    iconColor: 'text-purple-700',
    borderColor: 'border-purple-400',
  },
  'الصف الأول الثانوي': {
    bg: 'bg-sky-100/95 hover:bg-sky-200/95 text-sky-950 border-sky-300/80 shadow-sky-900/5',
    badge: 'bg-sky-200 text-sky-950',
    dot: 'bg-sky-600',
    iconColor: 'text-sky-700',
    borderColor: 'border-sky-400',
  },
  'الصف الثالث الإعدادي': {
    bg: 'bg-emerald-100/95 hover:bg-emerald-200/95 text-emerald-950 border-emerald-300/80 shadow-emerald-900/5',
    badge: 'bg-emerald-200 text-emerald-950',
    dot: 'bg-emerald-600',
    iconColor: 'text-emerald-700',
    borderColor: 'border-emerald-400',
  },
  'الصف الثاني الإعدادي': {
    bg: 'bg-amber-100/95 hover:bg-amber-200/95 text-amber-950 border-amber-300/80 shadow-amber-900/5',
    badge: 'bg-amber-200 text-amber-950',
    dot: 'bg-amber-600',
    iconColor: 'text-amber-700',
    borderColor: 'border-amber-400',
  },
  'الصف الأول الإعدادي': {
    bg: 'bg-pink-100/95 hover:bg-pink-200/95 text-pink-950 border-pink-300/80 shadow-pink-900/5',
    badge: 'bg-pink-200 text-pink-950',
    dot: 'bg-pink-600',
    iconColor: 'text-pink-700',
    borderColor: 'border-pink-400',
  },
};

const FALLBACK_THEMES: GradeTheme[] = [
  GRADE_THEMES['الصف الثالث الثانوي'],
  GRADE_THEMES['الصف الثاني الثانوي'],
  GRADE_THEMES['الصف الأول الثانوي'],
  GRADE_THEMES['الصف الثالث الإعدادي'],
  GRADE_THEMES['الصف الثاني الإعدادي'],
  GRADE_THEMES['الصف الأول الإعدادي'],
];

/**
 * Returns a consistent, semantic grade theme based on grade level and group name.
 */
export function getGradeLevelTheme(gradeLevel?: string | null, groupName?: string | null): GradeTheme {
  if (gradeLevel && GRADE_THEMES[gradeLevel]) {
    return GRADE_THEMES[gradeLevel];
  }

  // Consistent hash for unmapped names
  const key = `${gradeLevel || ''}_${groupName || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_THEMES.length;
  return FALLBACK_THEMES[idx];
}

/**
 * Safely formats any Date or date string to local YYYY-MM-DD without UTC timezone drift.
 */
export function toLocalDateStr(d?: Date | string | null): string {
  if (!d) return '';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    d = parsed;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
