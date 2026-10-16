import { CourseLesson, CourseModule } from "./courses.types";

export interface AssessmentToDeleteState {
  id: string;
  title: string;
  type: "EXAM" | "HOMEWORK";
  scope: "course" | "unit" | "lesson";
  targetId?: string;
}

export interface LessonModalState {
  isOpen: boolean;
  moduleId: string;
  lesson: CourseLesson | null;
  initialTab?: "video" | "summary" | "attachments" | "quiz";
  newAssessmentId?: string;
  newAssessmentType?: string;
  newAssessmentTitle?: string;
}

export interface DragItemState {
  type: "module" | "lesson";
  id: string;
  moduleId?: string;
}

export interface LessonDropTargetState {
  moduleId: string;
  index: number;
}
