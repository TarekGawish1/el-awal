"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
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
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-28 rounded-md hidden sm:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
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
