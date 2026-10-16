"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { SelectedReceiptState } from "../../types/course-management.types";
import { CoursePendingEnrollmentsTable } from "./CoursePendingEnrollmentsTable";
import { CourseActiveEnrollmentsTable } from "./CourseActiveEnrollmentsTable";
import { CourseUnsubscribedStudentsTable } from "./CourseUnsubscribedStudentsTable";

export interface CourseEnrollmentsTableProps {
  filter: "PENDING" | "ACTIVE" | "UNSUBSCRIBED";
  isLoading: boolean;
  filteredPending: any[];
  pendingRequests: any[];
  filteredActive: any[];
  activeStudents: any[];
  filteredUnsubscribed: any[];
  unsubscribedStudents: any[];
  onOpenReceipt: (receipt: SelectedReceiptState) => void;
  onApprove: (enrollmentId: string) => void;
  isApprovePending: boolean;
  onOpenReject: (target: { enrollmentId: string; studentName: string; courseName: string }) => void;
  isRejectPending: boolean;
  onOpenCancel: (target: { enrollmentId: string; studentName: string; courseName: string }) => void;
  onOpenDirectEnroll: (student: any) => void;
}

export function CourseEnrollmentsTable({
  filter,
  isLoading,
  filteredPending,
  pendingRequests,
  filteredActive,
  activeStudents,
  filteredUnsubscribed,
  unsubscribedStudents,
  onOpenReceipt,
  onApprove,
  isApprovePending,
  onOpenReject,
  isRejectPending,
  onOpenCancel,
  onOpenDirectEnroll,
}: CourseEnrollmentsTableProps) {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm font-medium">جاري تحميل طلبات الاشتراك والبيانات...</p>
      </div>
    );
  }

  if (filter === "PENDING") {
    return (
      <CoursePendingEnrollmentsTable
        filteredPending={filteredPending}
        pendingRequests={pendingRequests}
        onOpenReceipt={onOpenReceipt}
        onApprove={onApprove}
        isApprovePending={isApprovePending}
        onOpenReject={onOpenReject}
        isRejectPending={isRejectPending}
      />
    );
  }

  if (filter === "ACTIVE") {
    return (
      <CourseActiveEnrollmentsTable
        filteredActive={filteredActive}
        activeStudents={activeStudents}
        onOpenReceipt={onOpenReceipt}
        onOpenCancel={onOpenCancel}
      />
    );
  }

  return (
    <CourseUnsubscribedStudentsTable
      filteredUnsubscribed={filteredUnsubscribed}
      unsubscribedStudents={unsubscribedStudents}
      onOpenDirectEnroll={onOpenDirectEnroll}
    />
  );
}
