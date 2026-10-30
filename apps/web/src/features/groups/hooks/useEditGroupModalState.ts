'use client';

import { useState, useEffect } from 'react';
import { CreateGroupPayload, GroupWithDetails } from '../types/groups.types';
import { useUpdateGroup, useGroups } from './useGroups';
import { findGroupScheduleConflict, describeConflict } from '../utils/scheduleConflict';
import { DAY_PAIRS } from '../components/TimeSelect';
import toast from 'react-hot-toast';

export const GRADE_OPTIONS: Record<string, { label: string; value: string }[]> = {
  PRIMARY: [
    { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
    { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
    { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
    { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
    { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
    { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
  ],
  PREPARATORY: [
    { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
    { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
    { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
  ],
  MIDDLE: [
    { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
    { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
    { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
  ],
  SECONDARY: [
    { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
    { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
    { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
  ],
};

export const ACADEMIC_TERM_OPTIONS = [
  { label: 'الفصل الدراسي الأول', value: 'FIRST_TERM' },
  { label: 'الفصل الدراسي الثاني', value: 'SECOND_TERM' },
];

export function useEditGroupModalState({
  group,
  onClose,
}: {
  group: GroupWithDetails | null | undefined;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateGroupPayload>({
    name: group?.name || '',
    gradeLevel: group?.gradeLevel || '',
    academicYear: group?.academicYear || '2026-2027',
    academicTerm: group?.academicTerm || 'FIRST_TERM',
    maxCapacity: group?.maxCapacity || 50,
    monthlyFee: group?.monthlyFee || 100,
    schedules:
      group?.schedules?.map((s: any) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location || '',
      })) || [],
  });

  const [educationalStage, setEducationalStage] = useState('');
  const [groupLocation, setGroupLocation] = useState(group?.schedules?.[0]?.location || '');
  const [slot1Suggested, setSlot1Suggested] = useState(false);

  // Auto-suggest second slot when first slot day OR time changes
  useEffect(() => {
    const schedules = formData.schedules || [];
    if (schedules.length < 2 || !slot1Suggested) return;
    const first = schedules[0];
    const suggestedDay = DAY_PAIRS[first.dayOfWeek] ?? schedules[1].dayOfWeek;
    setFormData((prev) => {
      const newSchedules = [...(prev.schedules || [])];
      if (newSchedules.length < 2) return prev;
      newSchedules[1] = {
        ...newSchedules[1],
        dayOfWeek: suggestedDay,
        startTime: first.startTime,
        endTime: first.endTime,
      };
      return { ...prev, schedules: newSchedules };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    (formData.schedules || [])[0]?.dayOfWeek,
    (formData.schedules || [])[0]?.startTime,
    (formData.schedules || [])[0]?.endTime,
    slot1Suggested,
  ]);

  // Re-initialize when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        gradeLevel: group.gradeLevel,
        academicYear: group.academicYear || '2026-2027',
        academicTerm: group.academicTerm || 'FIRST_TERM',
        maxCapacity: group.maxCapacity || 50,
        monthlyFee: group.monthlyFee || 100,
        schedules:
          group.schedules?.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || '',
          })) || [],
      });
      // Try to determine stage from gradeLevel
      if (group.gradeLevel.includes('الابتدائي')) setEducationalStage('PRIMARY');
      else if (group.gradeLevel.includes('الإعدادي')) setEducationalStage('PREPARATORY');
      else if (group.gradeLevel.includes('الثانوي')) setEducationalStage('SECONDARY');

      // Initialize location if exists
      if (group.schedules && group.schedules.length > 0 && group.schedules[0].location) {
        setGroupLocation(group.schedules[0].location);
      }
    }
  }, [group]);

  useEffect(() => {
    const daysMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const schedules = formData.schedules || [];
    const days = schedules.map((s) => daysMap[s.dayOfWeek]);
    const uniqueDays = Array.from(new Set(days));
    let expectedName = '';

    // Format the first schedule time to 12h Arabic
    let timeString = '';
    if (schedules.length > 0 && schedules[0].startTime) {
      const [h, m] = schedules[0].startTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? 'ص' : 'م';
        timeString = `(الساعة ${hour12}:${m.toString().padStart(2, '0')} ${ampm})`;
      }
    }

    if (uniqueDays.length > 0) {
      expectedName = `مجموعة ${uniqueDays.join(' و ')} ${timeString}`.trim();
      if (formData.gradeLevel) {
        expectedName += ` - ${formData.gradeLevel}`;
      }
    } else if (formData.gradeLevel) {
      expectedName = `مجموعة ${formData.gradeLevel}`;
    }

    if (expectedName && groupLocation) {
      expectedName += ` - ${groupLocation}`;
    }

    if (expectedName) {
      setFormData((prev) => {
        if (prev.name === expectedName) return prev;
        return { ...prev, name: expectedName };
      });
    }
  }, [formData.schedules, formData.gradeLevel, groupLocation]);

  const { data: existingGroups } = useGroups();
  const updateGroup = useUpdateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

    // Reject the edit when the new schedule clashes (same day + overlapping time)
    const conflict = findGroupScheduleConflict(
      {
        schedules: formData.schedules,
        academicYear: formData.academicYear,
        academicTerm: formData.academicTerm,
      },
      existingGroups,
      { excludeGroupId: group.id }
    );
    if (conflict) {
      toast.error(describeConflict(conflict));
      return;
    }

    // Inject the shared location into all schedules
    const schedulesWithLocation =
      formData.schedules?.map((s) => ({
        ...s,
        location: groupLocation,
      })) || [];

    updateGroup.mutate(
      {
        id: group.id,
        payload: {
          ...formData,
          schedules: schedulesWithLocation,
          maxCapacity: formData.maxCapacity ? Number(formData.maxCapacity) : undefined,
          monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : undefined,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return {
    formData,
    setFormData,
    educationalStage,
    setEducationalStage,
    groupLocation,
    setGroupLocation,
    slot1Suggested,
    setSlot1Suggested,
    updateGroup,
    handleSubmit,
    gradeOptions: GRADE_OPTIONS,
    academicTermOptions: ACADEMIC_TERM_OPTIONS,
  };
}
