import { CourseDetail } from "./courses.types";

export interface SelectedReceiptState {
  url: string;
  studentName: string;
  courseName: string;
  amount: number;
  phone: string;
  enrollmentId: string;
  isActive?: boolean;
}

export interface RejectTargetState {
  enrollmentId: string;
  studentName: string;
  courseName: string;
}

export interface CancelModalTargetState {
  enrollmentId: string;
  studentName: string;
  courseName: string;
}

export interface DirectEnrollTargetState {
  studentId: string;
  studentName: string;
  studentCode: string;
  gradeLevel: string;
}
