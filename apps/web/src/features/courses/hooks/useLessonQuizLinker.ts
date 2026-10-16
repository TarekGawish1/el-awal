"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAssessments } from "@/features/assessments/hooks/use-assessments";
import { updateAssessment } from "@/features/assessments/api/assessments.api";
import { LessonEditorTabType } from "../types/lesson-editor.types";

export interface UseLessonQuizLinkerProps {
  isOpen: boolean;
  courseId: string;
  lesson?: any;
  newAssessmentId?: string;
  newAssessmentType?: string;
  newAssessmentTitle?: string;
  setActiveTab: React.Dispatch<React.SetStateAction<LessonEditorTabType>>;
}

export function useLessonQuizLinker({
  isOpen,
  courseId,
  lesson,
  newAssessmentId,
  newAssessmentType,
  newAssessmentTitle,
  setActiveTab,
}: UseLessonQuizLinkerProps) {
  const { data: assessmentsData } = useAssessments(undefined, {
    enabled: isOpen,
  });
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : assessmentsData?.data || [];

  const [lessonQuizId, setLessonQuizId] = useState("");
  const [lessonHomeworkId, setLessonHomeworkId] = useState("");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [
    allowHomeworkMultipleAttempts,
    setAllowHomeworkMultipleAttempts,
  ] = useState(false);
  const [isQuizOptional, setIsQuizOptional] = useState(false);
  const [isHomeworkOptional, setIsHomeworkOptional] = useState(false);
  const [isQuizPassRequired, setIsQuizPassRequired] = useState(false);
  const [isHomeworkPassRequired, setIsHomeworkPassRequired] = useState(false);

  const initialQuizIdRef = useRef<string | null>(null);
  const initialHomeworkIdRef = useRef<string | null>(null);
  const lastLoadedQuizIdRef = useRef<string | null>(null);
  const lastLoadedHomeworkIdRef = useRef<string | null>(null);

  // Merge general assessments with any specific assessments linked on the lesson object
  const allAvailableAssessments = useMemo(() => {
    const map = new Map<string, any>();
    assessments.forEach((a: any) => {
      if (a?.id) map.set(a.id, a);
    });
    if (lesson?.lessonQuiz?.id) {
      map.set(lesson.lessonQuiz.id, lesson.lessonQuiz);
    }
    if (Array.isArray(lesson?.assessments)) {
      lesson.assessments.forEach((a: any) => {
        if (a?.id) map.set(a.id, a);
      });
    }
    if (newAssessmentId && !map.has(newAssessmentId)) {
      const isHw =
        newAssessmentType === "ASSIGNMENT" ||
        newAssessmentType === "HOMEWORK";
      map.set(newAssessmentId, {
        id: newAssessmentId,
        title: newAssessmentTitle
          ? decodeURIComponent(newAssessmentTitle)
          : isHw
          ? "الواجب الجديد المضاف"
          : "الاختبار الجديد المضاف",
        type: isHw ? "ASSIGNMENT" : "EXAM",
        assessmentType: isHw ? "HOMEWORK" : "EXAM",
        lessonId: lesson?.id,
        allowMultipleAttempts: false,
        isOptional: false,
        requirePassingScore: false,
      });
    }
    return Array.from(map.values());
  }, [
    assessments,
    lesson,
    newAssessmentId,
    newAssessmentType,
    newAssessmentTitle,
  ]);

  const examOptions = useMemo(() => {
    return allAvailableAssessments.filter(
      (a: any) => a?.type === "EXAM" || a?.type === "QUIZ",
    );
  }, [allAvailableAssessments]);

  const homeworkOptions = useMemo(() => {
    return allAvailableAssessments.filter(
      (a: any) =>
        a?.type === "ASSIGNMENT" ||
        a?.type === "HOMEWORK" ||
        a?.assessmentType === "HOMEWORK",
    );
  }, [allAvailableAssessments]);

  // Auto-select and auto-link newly created assessment passed via props
  useEffect(() => {
    if (!newAssessmentId) return;
    const isHw =
      newAssessmentType === "ASSIGNMENT" ||
      newAssessmentType === "HOMEWORK";

    if (isHw) {
      setLessonHomeworkId(newAssessmentId);
      if (!initialHomeworkIdRef.current) {
        initialHomeworkIdRef.current = newAssessmentId;
      }
      if (lesson?.id) {
        updateAssessment(newAssessmentId, {
          lessonId: lesson.id,
          courseId,
        }).catch(() => {});
      }
    } else {
      setLessonQuizId(newAssessmentId);
      if (!initialQuizIdRef.current) {
        initialQuizIdRef.current = newAssessmentId;
      }
      if (lesson?.id) {
        updateAssessment(newAssessmentId, {
          lessonId: lesson.id,
          courseId,
        }).catch(() => {});
      }
    }
    setActiveTab("quiz");

    // Clean up query parameters from URL so refreshes/re-renders don't re-trigger
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("newAssessmentId")
    ) {
      const url = new URL(window.location.href);
      url.searchParams.delete("newAssessmentId");
      url.searchParams.delete("newAssessmentType");
      url.searchParams.delete("newAssessmentTitle");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [newAssessmentId, newAssessmentType, lesson?.id, courseId, setActiveTab]);

  // If newly created assessments finish loading, associate them if not already assigned
  useEffect(() => {
    if (!lesson?.id) return;
    if (!lessonHomeworkId) {
      const matchHw = allAvailableAssessments.find(
        (a: any) =>
          a.lessonId === lesson.id &&
          (a.type === "ASSIGNMENT" ||
            a.type === "HOMEWORK" ||
            a.assessmentType === "HOMEWORK"),
      );
      if (matchHw) {
        setLessonHomeworkId(matchHw.id);
        if (!initialHomeworkIdRef.current)
          initialHomeworkIdRef.current = matchHw.id;
      }
    }
    if (!lessonQuizId) {
      const matchExam = allAvailableAssessments.find(
        (a: any) =>
          a.lessonId === lesson.id &&
          (a.type === "EXAM" || a.type === "QUIZ"),
      );
      if (matchExam) {
        setLessonQuizId(matchExam.id);
        if (!initialQuizIdRef.current) initialQuizIdRef.current = matchExam.id;
      }
    }
  }, [lesson?.id, allAvailableAssessments, lessonHomeworkId, lessonQuizId]);

  // Reflect the selected quiz's current attempt policy, optionality, and pass requirement
  useEffect(() => {
    if (!lessonQuizId) {
      lastLoadedQuizIdRef.current = null;
      setAllowMultipleAttempts(false);
      setIsQuizOptional(false);
      setIsQuizPassRequired(false);
      return;
    }
    if (lastLoadedQuizIdRef.current !== lessonQuizId) {
      const selected = allAvailableAssessments.find(
        (a: any) => a.id === lessonQuizId,
      );
      if (selected) {
        lastLoadedQuizIdRef.current = lessonQuizId;
        const passReq = Boolean(selected.requirePassingScore ?? false);
        setAllowMultipleAttempts(
          passReq ? true : Boolean(selected.allowMultipleAttempts ?? false),
        );
        setIsQuizOptional(
          passReq ? false : Boolean(selected.isOptional ?? false),
        );
        setIsQuizPassRequired(passReq);
      }
    }
  }, [lessonQuizId, allAvailableAssessments]);

  // Reflect the selected homework's attempt policy, optionality, and pass requirement
  useEffect(() => {
    if (!lessonHomeworkId) {
      lastLoadedHomeworkIdRef.current = null;
      setAllowHomeworkMultipleAttempts(false);
      setIsHomeworkOptional(false);
      setIsHomeworkPassRequired(false);
      return;
    }
    if (lastLoadedHomeworkIdRef.current !== lessonHomeworkId) {
      const selected = allAvailableAssessments.find(
        (a: any) => a.id === lessonHomeworkId,
      );
      if (selected) {
        lastLoadedHomeworkIdRef.current = lessonHomeworkId;
        const passReq = Boolean(selected.requirePassingScore ?? false);
        setAllowHomeworkMultipleAttempts(
          passReq
            ? true
            : Boolean(selected.allowMultipleAttempts ?? false),
        );
        setIsHomeworkOptional(
          passReq ? false : Boolean(selected.isOptional ?? false),
        );
        setIsHomeworkPassRequired(passReq);
      }
    }
  }, [lessonHomeworkId, allAvailableAssessments]);

  const initLessonAssessments = (l: any) => {
    if (l) {
      const linkedExam =
        l.lessonQuiz &&
        (l.lessonQuiz.type === "EXAM" || l.lessonQuiz.type === "QUIZ")
          ? l.lessonQuiz
          : l.assessments?.find(
              (a: any) => a.type === "EXAM" || a.type === "QUIZ",
            ) ||
            (l.lessonQuizId
              ? allAvailableAssessments.find(
                  (a: any) =>
                    a.id === l.lessonQuizId &&
                    (a.type === "EXAM" || a.type === "QUIZ"),
                )
              : null);

      const linkedHomework =
        l.assessments?.find(
          (a: any) =>
            a.type === "ASSIGNMENT" ||
            a.type === "HOMEWORK" ||
            a.assessmentType === "HOMEWORK",
        ) ||
        (l.lessonQuiz &&
        (l.lessonQuiz.type === "ASSIGNMENT" ||
          l.lessonQuiz.type === "HOMEWORK")
          ? l.lessonQuiz
          : null) ||
        (l.lessonQuizId
          ? allAvailableAssessments.find(
              (a: any) =>
                a.id === l.lessonQuizId &&
                (a.type === "ASSIGNMENT" || a.type === "HOMEWORK"),
            )
          : null) ||
        allAvailableAssessments.find(
          (a: any) =>
            a.lessonId === l.id &&
            (a.type === "ASSIGNMENT" ||
              a.type === "HOMEWORK" ||
              a.assessmentType === "HOMEWORK"),
        );

      const finalQuizId =
        linkedExam?.id ||
        (l.lessonQuizId &&
        (!linkedHomework || l.lessonQuizId !== linkedHomework.id)
          ? l.lessonQuizId
          : "");
      const finalHomeworkId = linkedHomework?.id || "";

      setLessonQuizId(finalQuizId);
      setLessonHomeworkId(finalHomeworkId);
      initialQuizIdRef.current = finalQuizId || null;
      initialHomeworkIdRef.current = finalHomeworkId || null;
    } else {
      setLessonQuizId("");
      setLessonHomeworkId("");
      setIsQuizPassRequired(false);
      setIsHomeworkPassRequired(false);
      initialQuizIdRef.current = null;
      initialHomeworkIdRef.current = null;
    }
  };

  const syncAssessmentLinksOnSave = async (savedLessonId: string) => {
    // 1. Sync quiz policy and link
    if (lessonQuizId && savedLessonId) {
      try {
        await updateAssessment(lessonQuizId, {
          allowMultipleAttempts: isQuizPassRequired ? true : allowMultipleAttempts,
          isOptional: isQuizPassRequired ? false : isQuizOptional,
          requirePassingScore: isQuizPassRequired,
          lessonId: savedLessonId,
          courseId,
        });
      } catch {
        // Best-effort
      }
    }
    if (
      initialQuizIdRef.current &&
      initialQuizIdRef.current !== lessonQuizId
    ) {
      try {
        await updateAssessment(initialQuizIdRef.current, {
          lessonId: null,
        });
      } catch {}
    }

    // 2. Link or unlink homework
    if (savedLessonId) {
      if (lessonHomeworkId) {
        try {
          await updateAssessment(lessonHomeworkId, {
            isOptional: isHomeworkPassRequired ? false : isHomeworkOptional,
            requirePassingScore: isHomeworkPassRequired,
            allowMultipleAttempts: isHomeworkPassRequired
              ? true
              : allowHomeworkMultipleAttempts,
            lessonId: savedLessonId,
            courseId,
          });
        } catch {}
      }
      if (
        initialHomeworkIdRef.current &&
        initialHomeworkIdRef.current !== lessonHomeworkId
      ) {
        try {
          await updateAssessment(initialHomeworkIdRef.current, {
            lessonId: null,
          });
        } catch {}
      }
    }
  };

  return {
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
    initLessonAssessments,
    syncAssessmentLinksOnSave,
  };
}
