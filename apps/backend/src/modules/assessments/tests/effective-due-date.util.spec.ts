import { describe, expect, it } from '@jest/globals';
import {
  computeEffectiveDueDate,
  getSessionStartMillis,
  SessionForDeadline,
} from '../utils/effective-due-date.util';

// Session dates arrive as UTC-midnight calendar stamps; start times are
// interpreted in the server's local zone (Egypt), so expectations mirror the
// util's local-time construction instead of hardcoded instants.
const localStart = (y: number, mo: number, d: number, h: number, m: number) =>
  new Date(y, mo, d, h, m);

const ses = (
  isoDate: string,
  startTime?: string,
  isCancelled = false,
): SessionForDeadline => ({
  sessionDate: new Date(isoDate),
  startTime: startTime ?? null,
  endTime: null,
  isCancelled,
});

describe('computeEffectiveDueDate', () => {
  it('extends a legacy homework deadline (session own day) to the next session', () => {
    const raw = new Date('2026-08-25T00:00:00.000Z');
    const sessions = [
      ses('2026-08-22T00:00:00.000Z', '10:00'),
      ses('2026-08-25T00:00:00.000Z', '07:15'),
      ses('2026-08-29T00:00:00.000Z', '10:00'),
    ];
    const result = computeEffectiveDueDate('ASSIGNMENT', raw, sessions);
    expect(result?.toISOString()).toBe(localStart(2026, 7, 29, 10, 0).toISOString());
  });

  it('keeps a deadline aligned to the next session start', () => {
    const raw = localStart(2026, 7, 29, 10, 0);
    const sessions = [
      ses('2026-08-25T00:00:00.000Z', '07:15'),
      ses('2026-08-29T00:00:00.000Z', '10:00'),
    ];
    const result = computeEffectiveDueDate('ASSIGNMENT', raw, sessions);
    expect(result?.toISOString()).toBe(raw.toISOString());
  });

  it('falls back to the raw deadline when no session matches', () => {
    const raw = new Date('2026-08-25T00:00:00.000Z');
    const result = computeEffectiveDueDate('ASSIGNMENT', raw, [ses('2026-09-01T00:00:00.000Z', '10:00')]);
    expect(result?.toISOString()).toBe(raw.toISOString());
  });

  it('does not touch exams or missing deadlines', () => {
    const raw = new Date('2026-08-25T00:00:00.000Z');
    const sessions = [
      ses('2026-08-25T00:00:00.000Z', '07:15'),
      ses('2026-08-29T00:00:00.000Z', '10:00'),
    ];
    expect(computeEffectiveDueDate('EXAM', raw, sessions)).toEqual(raw);
    expect(computeEffectiveDueDate('ASSIGNMENT', null, sessions)).toBeNull();
  });

  it('skips cancelled sessions when resolving the next start', () => {
    const raw = new Date('2026-08-25T00:00:00.000Z');
    const sessions = [
      ses('2026-08-25T00:00:00.000Z', '07:15'),
      ses('2026-08-29T00:00:00.000Z', '10:00', true),
      ses('2026-09-01T00:00:00.000Z', '16:00'),
    ];
    const result = computeEffectiveDueDate('ASSIGNMENT', raw, sessions);
    expect(result?.toISOString()).toBe(localStart(2026, 8, 1, 16, 0).toISOString());
  });

  it('resolves the session start time', () => {
    expect(getSessionStartMillis(ses('2026-08-29T00:00:00.000Z', '10:00'))).toBe(
      localStart(2026, 7, 29, 10, 0).getTime(),
    );
  });
});
