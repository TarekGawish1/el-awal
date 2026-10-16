"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import {
  LessonExamCard,
  showLogicalConflictToast,
} from "./LessonExamCard";
import { LessonHomeworkCard } from "./LessonHomeworkCard";

export { showLogicalConflictToast };

export interface LessonQuizSectionProps {
  lessonQuizId: string;
  setLessonQuizId: (id: string) => void;
  lessonHomeworkId: string;
  setLessonHomeworkId: (id: string) => void;
  allowMultipleAttempts: boolean;
  setAllowMultipleAttempts: (val: boolean) => void;
  allowHomeworkMultipleAttempts: boolean;
  setAllowHomeworkMultipleAttempts: (val: boolean) => void;
  isQuizOptional: boolean;
  setIsQuizOptional: (val: boolean) => void;
  isHomeworkOptional: boolean;
  setIsHomeworkOptional: (val: boolean) => void;
  isQuizPassRequired: boolean;
  setIsQuizPassRequired: (val: boolean) => void;
  isHomeworkPassRequired: boolean;
  setIsHomeworkPassRequired: (val: boolean) => void;
  examOptions: any[];
  homeworkOptions: any[];
  newAssessmentId?: string;
  isSavingAndRedirecting: boolean;
  handleSaveAndCreateAssessment: (type: "EXAM" | "ASSIGNMENT") => Promise<void>;
}

export function LessonQuizSection({
  lessonQuizId,
  setLessonQuizId,
  lessonHomeworkId,
  setLessonHomeworkId,
  allowMultipleAttempts,
  setAllowMultipleAttempts,
  allowHomeworkMultipleAttempts,
  setAllowHomeworkMultipleAttempts,
  isQuizOptional,
  setIsQuizOptional,
  isHomeworkOptional,
  setIsHomeworkOptional,
  isQuizPassRequired,
  setIsQuizPassRequired,
  isHomeworkPassRequired,
  setIsHomeworkPassRequired,
  examOptions,
  homeworkOptions,
  newAssessmentId,
  isSavingAndRedirecting,
  handleSaveAndCreateAssessment,
}: LessonQuizSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header explanation */}
      <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 leading-relaxed">
          يمكنك تخصيص <strong>امتحان تقييمي</strong> و<strong>واجب منزلي</strong> معاً لهذا الدرس. يتم حفظ التعديلات وحفظ بيانات الدرس وفيديوهاته تلقائياً أولاً قبل الانتقال لأي منشئ اختبارات.
        </p>
      </div>

      {/* CARD 1: LESSON EXAM / QUIZ */}
      <LessonExamCard
        lessonQuizId={lessonQuizId}
        setLessonQuizId={setLessonQuizId}
        allowMultipleAttempts={allowMultipleAttempts}
        setAllowMultipleAttempts={setAllowMultipleAttempts}
        isQuizOptional={isQuizOptional}
        setIsQuizOptional={setIsQuizOptional}
        isQuizPassRequired={isQuizPassRequired}
        setIsQuizPassRequired={setIsQuizPassRequired}
        examOptions={examOptions}
        newAssessmentId={newAssessmentId}
        isSavingAndRedirecting={isSavingAndRedirecting}
        handleSaveAndCreateAssessment={handleSaveAndCreateAssessment}
      />

      {/* CARD 2: LESSON HOMEWORK / ASSIGNMENT */}
      <LessonHomeworkCard
        lessonHomeworkId={lessonHomeworkId}
        setLessonHomeworkId={setLessonHomeworkId}
        allowHomeworkMultipleAttempts={allowHomeworkMultipleAttempts}
        setAllowHomeworkMultipleAttempts={setAllowHomeworkMultipleAttempts}
        isHomeworkOptional={isHomeworkOptional}
        setIsHomeworkOptional={setIsHomeworkOptional}
        isHomeworkPassRequired={isHomeworkPassRequired}
        setIsHomeworkPassRequired={setIsHomeworkPassRequired}
        homeworkOptions={homeworkOptions}
        newAssessmentId={newAssessmentId}
        isSavingAndRedirecting={isSavingAndRedirecting}
        handleSaveAndCreateAssessment={handleSaveAndCreateAssessment}
      />
    </div>
  );
}
