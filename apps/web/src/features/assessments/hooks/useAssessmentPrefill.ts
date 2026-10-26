'use client';

import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateAssessmentFormData } from '../types/assessments.schema';
import { Group } from '../../groups/types/groups.types';
import { getNextSessionDate } from './useAssessmentSchedule';

export interface UseAssessmentPrefillProps {
  methods: UseFormReturn<CreateAssessmentFormData, any, any>;
  paramCourseId: string | null;
  courseLinkScope: string | null;
  paramLessonTitle: string | null;
  paramModuleName: string | null;
  paramCourseName: string | null;
  paramGroupId: string | null;
  paramTopic: string | null;
  paramDueDate: string | null;
  allGroups?: Group[];
  activeYear?: string;
  activeTerm?: string;
  teacherCourses?: any[];
  type: 'EXAM' | 'ASSIGNMENT';
  dueDateOption: 'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE';
  watchedTargetGroupIds?: string[];
  setTargetScope: (scope: 'GROUPS' | 'COURSE') => void;
  setDueDateOption: (opt: 'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE') => void;
}

export function useAssessmentPrefill({
  methods,
  paramCourseId,
  courseLinkScope,
  paramLessonTitle,
  paramModuleName,
  paramCourseName,
  paramGroupId,
  paramTopic,
  paramDueDate,
  allGroups,
  activeYear,
  activeTerm,
  teacherCourses,
  type,
  dueDateOption,
  watchedTargetGroupIds,
  setTargetScope,
  setDueDateOption,
}: UseAssessmentPrefillProps) {
  useEffect(() => {
    if (paramCourseId) {
      setTargetScope('COURSE');
      methods.setValue('courseId', paramCourseId, { shouldValidate: true });
    }
  }, [paramCourseId, methods, setTargetScope]);

  useEffect(() => {
    if (
      courseLinkScope === 'LESSON' &&
      paramLessonTitle &&
      !methods.getValues('title')
    ) {
      const prefix = type === 'ASSIGNMENT' ? 'واجب درس' : 'اختبار درس';
      methods.setValue('title', `${prefix}: ${paramLessonTitle}`, {
        shouldValidate: true,
      });
      return;
    }

    if (
      courseLinkScope === 'UNIT' &&
      paramModuleName &&
      !methods.getValues('title')
    ) {
      methods.setValue('title', `اختبار وحدة: ${paramModuleName}`, {
        shouldValidate: true,
      });
      return;
    }

    if (courseLinkScope === 'COURSE' && !methods.getValues('title')) {
      const selectedCourse = teacherCourses?.find(
        (course) => course.id === paramCourseId
      );
      const courseName = paramCourseName || selectedCourse?.title;
      if (courseName) {
        methods.setValue('title', `الاختبار النهائي: ${courseName}`, {
          shouldValidate: true,
        });
      }
    }
  }, [
    courseLinkScope,
    paramCourseId,
    paramCourseName,
    paramModuleName,
    paramLessonTitle,
    type,
    teacherCourses,
    methods,
  ]);

  useEffect(() => {
    if (paramGroupId && allGroups && allGroups.length > 0) {
      const g = allGroups.find((group) => group.id === paramGroupId);
      if (g) {
        let stage = 'SECONDARY';
        if (g.gradeLevel?.includes('الابتدائي')) stage = 'PRIMARY';
        else if (g.gradeLevel?.includes('الإعدادي')) stage = 'MIDDLE';

        methods.setValue('academicStage', stage, { shouldValidate: true });
        methods.setValue('gradeLevel', g.gradeLevel, { shouldValidate: true });

        const groupsForGrade = allGroups.filter(
          (grp) =>
            grp.gradeLevel === g.gradeLevel &&
            grp.academicYear === activeYear &&
            grp.academicTerm === activeTerm
        );
        methods.setValue(
          'targetGroupIds',
          groupsForGrade.map((grp) => grp.id),
          { shouldValidate: true }
        );

        if (paramTopic && !methods.getValues('title')) {
          const prefix = type === 'ASSIGNMENT' ? 'واجب' : 'اختبار';
          methods.setValue('title', `${prefix}: ${paramTopic}`, {
            shouldValidate: true,
          });
        }

        if (paramDueDate) {
          setDueDateOption('CUSTOM');
          methods.setValue('dueDate', new Date(paramDueDate).toISOString(), {
            shouldValidate: true,
          });
        }
      }
    }
  }, [
    paramGroupId,
    paramTopic,
    paramDueDate,
    allGroups,
    activeYear,
    activeTerm,
    type,
    methods,
    setDueDateOption,
  ]);

  useEffect(() => {
    if (type === 'ASSIGNMENT' && dueDateOption === 'NEXT_SESSION') {
      const calculatedDate = getNextSessionDate(
        allGroups || [],
        watchedTargetGroupIds || []
      );
      if (calculatedDate) {
        methods.setValue('dueDate', calculatedDate.toISOString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        methods.setValue('dueDate', '', { shouldValidate: true });
      }
    }
  }, [watchedTargetGroupIds, dueDateOption, allGroups, type, methods]);
}
