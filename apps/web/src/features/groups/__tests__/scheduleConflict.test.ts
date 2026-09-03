import { describe, it, expect } from 'vitest';
import { findGroupScheduleConflict, describeConflict } from '../utils/scheduleConflict';
import { Group, GroupSchedule } from '../types/groups.types';

function makeGroup(overrides: Partial<Group>): Group {
  return {
    id: 'g1',
    name: 'مجموعة الأحد',
    gradeLevel: 'الصف الثالث الثانوي',
    academicYear: '2026-2027',
    academicTerm: 'FIRST_TERM',
    teacherProfileId: 't1',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
    schedules: [
      { dayOfWeek: 0, startTime: '14:00', endTime: '15:00' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '15:00' },
    ],
    ...overrides,
  };
}

const candidate = (schedules: GroupSchedule[], extra?: { academicYear?: string; academicTerm?: string }) => ({
  schedules,
  academicYear: extra?.academicYear ?? '2026-2027',
  academicTerm: extra?.academicTerm ?? 'FIRST_TERM',
});

describe('findGroupScheduleConflict', () => {
  it('flags a same-day overlapping slot', () => {
    const conflict = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]),
      [makeGroup({})],
    );
    expect(conflict).not.toBeNull();
    expect(conflict?.group.id).toBe('g1');
    expect(conflict?.dayOfWeek).toBe(0);
  });

  it('allows a different day of week', () => {
    const conflict = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 1, startTime: '14:30', endTime: '15:30' }]),
      [makeGroup({})],
    );
    expect(conflict).toBeNull();
  });

  it('allows the same day with non-overlapping time', () => {
    const conflict = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '16:00', endTime: '17:00' }]),
      [makeGroup({})],
    );
    expect(conflict).toBeNull();
  });

  it('conflicts regardless of location', () => {
    const conflict = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30', location: 'قاعة أخرى' }]),
      [makeGroup({ schedules: [{ dayOfWeek: 0, startTime: '14:00', endTime: '15:00', location: 'قاعة 1' }] })],
    );
    expect(conflict).not.toBeNull();
  });

  it('ignores groups in a different academic year or term', () => {
    const otherYear = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]),
      [makeGroup({ academicYear: '2027-2028' })],
    );
    expect(otherYear).toBeNull();

    const otherTerm = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]),
      [makeGroup({ academicTerm: 'SECOND_TERM' })],
    );
    expect(otherTerm).toBeNull();
  });

  it('excludes the group being edited', () => {
    const conflict = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]),
      [makeGroup({ id: 'editing-me' })],
      { excludeGroupId: 'editing-me' },
    );
    expect(conflict).toBeNull();
  });

  it('returns null for empty inputs', () => {
    expect(findGroupScheduleConflict(candidate([]), [makeGroup({})])).toBeNull();
    expect(
      findGroupScheduleConflict(candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]), []),
    ).toBeNull();
    expect(
      findGroupScheduleConflict(candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]), undefined),
    ).toBeNull();
  });
});

describe('describeConflict', () => {
  it('mentions the conflicting group name and day', () => {
    const conflict = findGroupScheduleConflict(
      candidate([{ dayOfWeek: 0, startTime: '14:30', endTime: '15:30' }]),
      [makeGroup({ name: 'مجموعة الثانوية' })],
    )!;
    const msg = describeConflict(conflict);
    expect(msg).toContain('مجموعة الثانوية');
    expect(msg).toContain('الأحد');
    expect(msg).toContain('تعارض');
  });
});
