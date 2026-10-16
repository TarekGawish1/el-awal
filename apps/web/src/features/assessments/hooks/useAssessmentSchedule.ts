'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateAssessmentFormData } from '../types/assessments.schema';
import { Group, GroupSchedule } from '../../groups/types/groups.types';

export function getGroupNextSessionDate(group: Group): Date | null {
  if (!group.schedules || group.schedules.length === 0) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(15, 0, 0, 0); // 3:00 PM
    return nextWeek;
  }

  const now = new Date();
  let nextSessionDate: Date | null = null;
  let minDiff = Infinity;

  group.schedules.forEach((sched: GroupSchedule) => {
    let schedDay = 0;
    if (typeof sched.dayOfWeek === 'number') {
      schedDay = sched.dayOfWeek;
    } else {
      const daysMap: Record<string, number> = {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
      };
      schedDay = daysMap[sched.dayOfWeek as string] ?? 0;
    }

    let hours = 15;
    let minutes = 0;
    if (sched.startTime) {
      const [h, m] = sched.startTime.split(':').map(Number);
      if (!isNaN(h)) hours = h;
      if (!isNaN(m)) minutes = m;
    }

    const currentDay = now.getDay();
    let daysDiff = (schedDay - currentDay + 7) % 7;

    if (daysDiff === 0) {
      daysDiff = 7;
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysDiff);
    targetDate.setHours(hours, minutes, 0, 0);

    const diffTime = targetDate.getTime() - now.getTime();
    if (diffTime > 0 && diffTime < minDiff) {
      minDiff = diffTime;
      nextSessionDate = targetDate;
    }
  });

  return nextSessionDate;
}

export function getNextSessionDate(
  groups: Group[],
  targetGroupIds: string[]
): Date | null {
  if (!targetGroupIds || targetGroupIds.length === 0) return null;

  const selectedGroups = groups.filter((g) => targetGroupIds.includes(g.id));
  let latestDate: Date | null = null;

  selectedGroups.forEach((g) => {
    const d = getGroupNextSessionDate(g);
    if (d) {
      if (!latestDate || d.getTime() > latestDate.getTime()) {
        latestDate = d;
      }
    }
  });

  return latestDate;
}

export function useAssessmentSchedule(
  methods: UseFormReturn<CreateAssessmentFormData>,
  initialTimingType?: string
) {
  const [scheduleMode, setScheduleMode] = useState<
    'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | 'DURATION_ONLY'
  >(
    initialTimingType === 'FLEXIBLE_WINDOW'
      ? 'FLEXIBLE_WINDOW'
      : 'FIXED_SESSION'
  );

  const selectScheduleMode = (
    mode: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | 'DURATION_ONLY'
  ) => {
    setScheduleMode(mode);
    if (mode === 'DURATION_ONLY') {
      methods.setValue('timingType', 'FLEXIBLE_WINDOW', {
        shouldDirty: true,
        shouldValidate: true,
      });
      methods.setValue('startTime', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
      methods.setValue('startDate', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
      methods.setValue('endTime', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
      methods.setValue('dueDate', '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      methods.setValue('timingType', mode, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleStartChange = (iso: string) => {
    methods.setValue('startTime', iso, {
      shouldValidate: true,
      shouldDirty: true,
    });
    methods.setValue('startDate', iso, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (scheduleMode !== 'FIXED_SESSION') return;
    const start = new Date(iso);
    if (isNaN(start.getTime())) return;
    const endRaw = methods.getValues('endTime');
    const end = endRaw ? new Date(endRaw) : null;
    if (end && !isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      methods.setValue(
        'durationMinutes',
        Math.round((end.getTime() - start.getTime()) / 60000),
        { shouldValidate: true, shouldDirty: true }
      );
    } else {
      const mins = Number(methods.getValues('durationMinutes'));
      if (mins > 0) {
        const newEnd = new Date(start.getTime() + mins * 60000).toISOString();
        methods.setValue('endTime', newEnd, {
          shouldValidate: true,
          shouldDirty: true,
        });
        methods.setValue('dueDate', newEnd, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  const handleEndChange = (iso: string) => {
    methods.setValue('endTime', iso, {
      shouldValidate: true,
      shouldDirty: true,
    });
    methods.setValue('dueDate', iso, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (scheduleMode !== 'FIXED_SESSION') return;
    const startRaw = methods.getValues('startTime');
    const start = startRaw ? new Date(startRaw) : null;
    const end = new Date(iso);
    if (!start || isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins > 0) {
      methods.setValue('durationMinutes', mins, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const syncCloseFromDuration = (rawMinutes: string) => {
    if (scheduleMode !== 'FIXED_SESSION') return;
    const mins = Number(rawMinutes);
    if (!mins || mins <= 0) return;
    const startRaw = methods.getValues('startTime');
    const start = startRaw ? new Date(startRaw) : null;
    if (!start || isNaN(start.getTime())) return;
    const newEnd = new Date(start.getTime() + mins * 60000).toISOString();
    methods.setValue('endTime', newEnd, {
      shouldValidate: true,
      shouldDirty: true,
    });
    methods.setValue('dueDate', newEnd, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return {
    scheduleMode,
    selectScheduleMode,
    handleStartChange,
    handleEndChange,
    syncCloseFromDuration,
  };
}
