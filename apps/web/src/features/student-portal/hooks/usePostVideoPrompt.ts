'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AssessmentSummary } from '@/features/courses/types/courses.types';

export interface PostVideoPromptState {
  isOpen: boolean;
  lessonId: string;
  lessonTitle: string;
  assessment: AssessmentSummary;
  isHomework: boolean;
}

export function usePostVideoPrompt(selectedLessonId: string | null) {
  const [postVideoPrompt, setPostVideoPrompt] = useState<PostVideoPromptState | null>(null);
  const hasPromptedQuizForLessonRef = useRef<string | null>(null);

  useEffect(() => {
    hasPromptedQuizForLessonRef.current = null;
  }, [selectedLessonId]);

  const triggerPostVideoPrompt = useCallback(
    (
      lessonId: string,
      lessonTitle: string,
      assessment: AssessmentSummary,
      isHomework: boolean
    ) => {
      if (hasPromptedQuizForLessonRef.current !== lessonId) {
        hasPromptedQuizForLessonRef.current = lessonId;
        setPostVideoPrompt({
          isOpen: true,
          lessonId,
          lessonTitle,
          assessment,
          isHomework,
        });
      }
    },
    []
  );

  return {
    postVideoPrompt,
    setPostVideoPrompt,
    triggerPostVideoPrompt,
  };
}
