export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
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
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();
  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

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

export function hashKeyToBigInt(key: string): bigint {
  let hash = 0x811c9dc5n;
  const prime = 0x01000193n;
  for (let i = 0; i < key.length; i++) {
    hash ^= BigInt(key.charCodeAt(i));
    hash = (hash * prime) & 0x7fffffffffffffffn;
  }
  return hash;
}

export function getSemesterDateWindow(
  academicYear?: string,
  academicTerm?: string,
): { startDate: Date; endDate: Date } {
  let startYear = 2026;
  let endYear = 2027;

  if (academicYear && academicYear.includes('-')) {
    const parts = academicYear.split('-');
    const y1 = parseInt(parts[0], 10);
    const y2 = parseInt(parts[1], 10);
    if (!isNaN(y1)) startYear = y1;
    if (!isNaN(y2)) endYear = y2;
    else endYear = startYear + 1;
  }

  if (academicTerm === 'FIRST_TERM') {
    return {
      startDate: new Date(Date.UTC(startYear, 7, 1)), // Aug 1
      endDate: new Date(Date.UTC(endYear, 0, 31)), // Jan 31
    };
  }

  if (academicTerm === 'SECOND_TERM') {
    return {
      startDate: new Date(Date.UTC(endYear, 1, 1)), // Feb 1
      endDate: new Date(Date.UTC(endYear, 6, 31)), // Jul 31
    };
  }

  // Default: full academic year (Aug 1 to Jul 31)
  return {
    startDate: new Date(Date.UTC(startYear, 7, 1)),
    endDate: new Date(Date.UTC(endYear, 6, 31)),
  };
}
