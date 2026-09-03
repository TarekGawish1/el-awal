import {
  parseTimeToMinutes,
  doTimeIntervalsOverlap,
  findScheduleConflict,
  buildConflictMessage,
  GroupWithSchedulesLike,
  ScheduleLike,
} from '../utils/schedule-conflict.util';

describe('schedule-conflict.util', () => {
  describe('parseTimeToMinutes', () => {
    it('parses 24h HH:MM', () => {
      expect(parseTimeToMinutes('14:30')).toBe(14 * 60 + 30);
      expect(parseTimeToMinutes('00:00')).toBe(0);
    });

    it('parses Arabic 12h format', () => {
      expect(parseTimeToMinutes('2:30 م')).toBe(14 * 60 + 30);
      expect(parseTimeToMinutes('12:00 ص')).toBe(0);
      expect(parseTimeToMinutes('12:00 م')).toBe(12 * 60);
    });

    it('parses AM/PM format', () => {
      expect(parseTimeToMinutes('2:30 PM')).toBe(14 * 60 + 30);
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);
    });

    it('returns null for empty/invalid input', () => {
      expect(parseTimeToMinutes('')).toBeNull();
      expect(parseTimeToMinutes(null)).toBeNull();
      expect(parseTimeToMinutes('not-a-time')).toBeNull();
    });
  });

  describe('doTimeIntervalsOverlap', () => {
    it('detects overlapping intervals', () => {
      expect(doTimeIntervalsOverlap('14:00', '15:00', '14:30', '15:30')).toBe(true);
      expect(doTimeIntervalsOverlap('14:00', '16:00', '15:00', '15:30')).toBe(true);
    });

    it('treats touching edges as NOT overlapping (half-open interval)', () => {
      expect(doTimeIntervalsOverlap('14:00', '15:00', '15:00', '16:00')).toBe(false);
    });

    it('returns false for disjoint intervals', () => {
      expect(doTimeIntervalsOverlap('14:00', '15:00', '16:00', '17:00')).toBe(false);
    });

    it('with both missing end times, only identical starts clash', () => {
      expect(doTimeIntervalsOverlap('14:00', null, '14:00', null)).toBe(true);
      expect(doTimeIntervalsOverlap('14:00', null, '14:30', null)).toBe(false);
    });
  });

  describe('findScheduleConflict', () => {
    const existing: GroupWithSchedulesLike[] = [
      {
        id: 'g1',
        name: 'مجموعة الأحد',
        schedules: [
          { dayOfWeek: 0, startTime: '14:00', endTime: '15:00' },
          { dayOfWeek: 3, startTime: '14:00', endTime: '15:00' },
        ],
      },
    ];

    it('flags same-day overlapping slot', () => {
      const candidate: ScheduleLike[] = [{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }];
      const conflict = findScheduleConflict(existing, candidate);
      expect(conflict).not.toBeNull();
      expect(conflict?.group.id).toBe('g1');
      expect(conflict?.dayOfWeek).toBe(0);
    });

    it('ignores different day of week', () => {
      const candidate: ScheduleLike[] = [{ dayOfWeek: 1, startTime: '14:30', endTime: '15:30' }];
      expect(findScheduleConflict(existing, candidate)).toBeNull();
    });

    it('ignores same day but non-overlapping time', () => {
      const candidate: ScheduleLike[] = [{ dayOfWeek: 0, startTime: '16:00', endTime: '17:00' }];
      expect(findScheduleConflict(existing, candidate)).toBeNull();
    });

    it('ignores location differences (conflict regardless of location)', () => {
      const candidate: ScheduleLike[] = [
        { dayOfWeek: 0, startTime: '14:30', endTime: '15:30', location: 'قاعة مختلفة' },
      ];
      expect(findScheduleConflict(existing, candidate)).not.toBeNull();
    });

    it('returns null for empty candidate or empty existing list', () => {
      expect(findScheduleConflict(existing, [])).toBeNull();
      expect(findScheduleConflict([], [{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }])).toBeNull();
      expect(findScheduleConflict(undefined as any, undefined)).toBeNull();
    });
  });

  describe('buildConflictMessage', () => {
    it('includes the conflicting group name and day', () => {
      const msg = buildConflictMessage({
        group: { id: 'g1', name: 'مجموعة الأحد' },
        dayOfWeek: 0,
        existingSlot: { dayOfWeek: 0, startTime: '14:00', endTime: '15:00' },
        candidateSlot: { dayOfWeek: 0, startTime: '14:30', endTime: '15:30' },
      });
      expect(msg).toContain('مجموعة الأحد');
      expect(msg).toContain('الأحد');
      expect(msg).toContain('تعارض');
    });
  });
});
