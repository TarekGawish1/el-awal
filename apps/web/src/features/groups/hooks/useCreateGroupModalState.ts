'use client';

import { useState, useEffect } from 'react';
import { useCreateGroup, useGroups } from './useGroups';
import { useStoredAcademicPeriod } from './useAcademicPeriod';
import { CreateGroupPayload } from '../types/groups.types';
import { findGroupScheduleConflict, describeConflict } from '../utils/scheduleConflict';
import { DAY_PAIRS } from '../components/TimeSelect';
import toast from 'react-hot-toast';

interface UseCreateGroupModalStateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function useCreateGroupModalState({ isOpen, onClose }: UseCreateGroupModalStateProps) {
  const { data: existingGroups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(existingGroups);

  const [formData, setFormData] = useState<CreateGroupPayload>({
    name: '',
    gradeLevel: '',
    academicYear: '2026-2027',
    academicTerm: 'FIRST_TERM',
    maxCapacity: 50,
    monthlyFee: 100,
    schedules: [
      { dayOfWeek: 0, startTime: '14:00', endTime: '15:00', location: '' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '15:00', location: '' },
    ],
  });

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        academicYear: activeYear || prev.academicYear || '2026-2027',
        academicTerm: (activeTerm as any) || prev.academicTerm || 'FIRST_TERM',
      }));
    }
  }, [isOpen, activeYear, activeTerm]);

  const [educationalStage, setEducationalStage] = useState('');
  const [groupLocation, setGroupLocation] = useState('');
  const [slot1Suggested, setSlot1Suggested] = useState(true);

  // Auto-suggest second schedule slot when first slot day OR time changes
  useEffect(() => {
    const schedules = formData.schedules || [];
    if (schedules.length < 2 || !slot1Suggested) return;

    const first = schedules[0];
    const second = schedules[1];
    const suggestedDay = DAY_PAIRS[first.dayOfWeek] ?? second.dayOfWeek;
    const suggestedStart = first.startTime;
    const suggestedEnd = first.endTime;

    if (
      second.dayOfWeek === suggestedDay &&
      second.startTime === suggestedStart &&
      second.endTime === suggestedEnd
    ) return;

    setFormData((prev) => {
      const newSchedules = [...(prev.schedules || [])];
      if (newSchedules.length < 2) return prev;
      newSchedules[1] = {
        ...newSchedules[1],
        dayOfWeek: suggestedDay,
        startTime: suggestedStart,
        endTime: suggestedEnd,
      };
      return { ...prev, schedules: newSchedules };
    });
  }, [
    (formData.schedules || [])[0]?.dayOfWeek,
    (formData.schedules || [])[0]?.startTime,
    (formData.schedules || [])[0]?.endTime,
    slot1Suggested,
  ]);

  // Auto-generate name based on days, time, grade, and location
  useEffect(() => {
    const daysMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const schedules = formData.schedules || [];
    const days = schedules.map((s) => daysMap[s.dayOfWeek]);
    const uniqueDays = Array.from(new Set(days));
    let expectedName = '';

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

  const createGroup = useCreateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const missingEnd = (formData.schedules || []).findIndex((s) => !s.endTime);
    if (missingEnd !== -1) {
      const daysMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayName = daysMap[(formData.schedules || [])[missingEnd]?.dayOfWeek ?? 0];
      toast.error(`يرجى تحديد وقت الانتهاء لموعد يوم ${dayName}`);
      return;
    }

    const conflict = findGroupScheduleConflict(
      {
        schedules: formData.schedules,
        academicYear: formData.academicYear,
        academicTerm: formData.academicTerm,
      },
      existingGroups,
    );
    if (conflict) {
      toast.error(describeConflict(conflict));
      return;
    }

    const schedulesWithLocation =
      formData.schedules?.map((s) => ({
        ...s,
        location: groupLocation,
      })) || [];

    createGroup.mutate(
      {
        ...formData,
        schedules: schedulesWithLocation,
        maxCapacity: formData.maxCapacity ? Number(formData.maxCapacity) : undefined,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : undefined,
      },
      {
        onSuccess: () => {
          setFormData({
            name: '',
            gradeLevel: '',
            academicYear: '2026-2027',
            academicTerm: 'FIRST_TERM',
            maxCapacity: 50,
            monthlyFee: 100,
            schedules: [
              { dayOfWeek: 0, startTime: '14:00', endTime: '15:00', location: '' },
              { dayOfWeek: 3, startTime: '14:00', endTime: '15:00', location: '' },
            ],
          });
          setEducationalStage('');
          setGroupLocation('');
          setSlot1Suggested(true);
          onClose();
        },
      },
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
    createGroup,
    handleSubmit,
    handleBackdropClick,
  };
}
