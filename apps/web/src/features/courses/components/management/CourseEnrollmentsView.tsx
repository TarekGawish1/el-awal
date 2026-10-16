"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Filter,
  X,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTeacherCourses, useTeacherSubscriptions } from "../../hooks/useCourses";
import { coursesApi } from "../../api/courses.api";
import { QUERY_KEYS } from "@/lib/api/query-keys";
import { useRealtimeCourseSubscriptions } from "@/lib/realtime/useRealtimeCourseSubscriptions";
import {
  SelectedReceiptState,
  RejectTargetState,
  CancelModalTargetState,
  DirectEnrollTargetState,
} from "../../types/course-management.types";
import { CourseReceiptModal } from "./CourseReceiptModal";
import { CourseEnrollmentActionModals } from "./CourseEnrollmentActionModals";
import { CourseEnrollmentsTable } from "./CourseEnrollmentsTable";

export function CourseEnrollmentsView() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"PENDING" | "ACTIVE" | "UNSUBSCRIBED">("PENDING");

  // Direct Enroll Modal State for Unsubscribed Students
  const { data: teacherCourses = [] } = useTeacherCourses();
  const [directEnrollTarget, setDirectEnrollTarget] = useState<DirectEnrollTargetState | null>(null);
  const [directEnrollCourseId, setDirectEnrollCourseId] = useState("");

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<SelectedReceiptState | null>(null);

  // Reject Modal State
  const [rejectTarget, setRejectTarget] = useState<RejectTargetState | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Cancel Active Subscription Modal State
  const [cancelModalTarget, setCancelModalTarget] = useState<CancelModalTargetState | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  // Real-time WebSocket live updates
  useRealtimeCourseSubscriptions();

  const { data, isLoading, isFetching, refetch } = useTeacherSubscriptions();

  const [courseFilter, setCourseFilter] = useState("ALL");
  const [studentSearch, setStudentSearch] = useState("");

  const pendingRequests = data?.pendingRequests ?? [];
  const activeStudents = data?.activeStudents ?? [];
  const unsubscribedStudents = data?.unsubscribedStudents ?? [];

  // Distinct courses for filter dropdown
  const distinctCourses = useMemo(() => {
    const map = new Map<string, string>();
    pendingRequests.forEach((r) => map.set(r.courseId, r.courseName));
    activeStudents.forEach((s) => map.set(s.courseId, s.courseName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [pendingRequests, activeStudents]);

  const filteredPending = useMemo(() => {
    return pendingRequests.filter((r) => {
      const matchesCourse = courseFilter === "ALL" || r.courseId === courseFilter;
      const matchesSearch =
        !studentSearch ||
        r.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        r.studentCode.toLowerCase().includes(studentSearch.toLowerCase()) ||
        r.studentPhone.includes(studentSearch) ||
        r.senderPhone.includes(studentSearch);
      return matchesCourse && matchesSearch;
    });
  }, [pendingRequests, courseFilter, studentSearch]);

  const filteredActive = useMemo(() => {
    return activeStudents.filter((s) => {
      const matchesCourse = courseFilter === "ALL" || s.courseId === courseFilter;
      const matchesSearch =
        !studentSearch ||
        s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentPhone.includes(studentSearch) ||
        (s.senderPhone && s.senderPhone.includes(studentSearch));
      return matchesCourse && matchesSearch;
    });
  }, [activeStudents, courseFilter, studentSearch]);

  const filteredUnsubscribed = useMemo(() => {
    return unsubscribedStudents.filter((s) => {
      const q = studentSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        (s.studentPhone && s.studentPhone.includes(q)) ||
        (s.parentPhone && s.parentPhone.includes(q)) ||
        (s.gradeLevel && s.gradeLevel.toLowerCase().includes(q))
      );
    });
  }, [unsubscribedStudents, studentSearch]);

  const directEnrollMutation = useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: string; studentId: string }) =>
      coursesApi.enrollStudentsBatch(courseId, [studentId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses.teacherSubscriptions() });
      queryClient.invalidateQueries({ queryKey: ["teacher-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast.success("تم تسجيل الطالب وتفعيل اشتراكه في الكورس بنجاح! 🎉");
      setDirectEnrollTarget(null);
      setDirectEnrollCourseId("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "تعذر تسجيل الطالب في الكورس");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (enrollmentId: string) => coursesApi.approveEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses.teacherSubscriptions() });
      queryClient.invalidateQueries({ queryKey: ["teacher-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast.success("تمت الموافقة وتفعيل اشتراك الطالب بنجاح! 🎉");
      setSelectedReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "تعذر قبول الطلب");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      coursesApi.rejectEnrollment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses.teacherSubscriptions() });
      queryClient.invalidateQueries({ queryKey: ["teacher-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast.success("تم رفض طلب الاشتراك.");
      setRejectTarget(null);
      setRejectionReason("");
      setSelectedReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "تعذر رفض الطلب");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      coursesApi.cancelEnrollment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.courses.teacherSubscriptions() });
      queryClient.invalidateQueries({ queryKey: ["teacher-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast.success("تم إلغاء اشتراك الطالب وتعليق وصوله للكورس بنجاح.");
      setCancelModalTarget(null);
      setCancellationReason("");
      setSelectedReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "تعذر إلغاء الاشتراك");
    },
  });

  return (
    <div className="space-y-6">
      {/* Sub-tabs and realtime indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-3 overflow-x-auto pb-1 -mb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shrink-0 ${
              filter === "PENDING"
                ? "bg-amber-500 text-white border border-amber-600"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>طلبات الاشتراك الجديدة</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filter === "PENDING" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingRequests.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shrink-0 ${
              filter === "ACTIVE"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>الطلاب المشتركون فعلياً</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filter === "ACTIVE" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {activeStudents.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNSUBSCRIBED")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shrink-0 ${
              filter === "UNSUBSCRIBED"
                ? "bg-sky-600 text-white border border-sky-700"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>طلاب مسجلون (غير مشتركين)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filter === "UNSUBSCRIBED" ? "bg-sky-700 text-white" : "bg-sky-100 text-sky-800"
              }`}
            >
              {unsubscribedStudents.length}
            </span>
          </button>
        </div>

        {/* Live sync pulse */}
        <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600 font-medium cursor-pointer"
            title="تحديث البيانات الآن"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary-600" : ""}`} />
            <span>تحديث مباشر</span>
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            مباشر (Realtime)
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="بحث باسم الطالب، كود الطالب، أو رقم هاتف المحفظة..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 rounded-xl px-4 py-2.5 pr-10 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          {studentSearch && (
            <button
              type="button"
              onClick={() => setStudentSearch("")}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="w-4 h-4 text-primary-600" />
            <span>فلترة حسب الكورس:</span>
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer min-w-[180px]"
          >
            <option value="ALL">جميع الكورسات ({distinctCourses.length})</option>
            {distinctCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <CourseEnrollmentsTable
          filter={filter}
          isLoading={isLoading}
          filteredPending={filteredPending}
          pendingRequests={pendingRequests}
          filteredActive={filteredActive}
          activeStudents={activeStudents}
          filteredUnsubscribed={filteredUnsubscribed}
          unsubscribedStudents={unsubscribedStudents}
          onOpenReceipt={setSelectedReceipt}
          onApprove={(id) => approveMutation.mutate(id)}
          isApprovePending={approveMutation.isPending}
          onOpenReject={setRejectTarget}
          isRejectPending={rejectMutation.isPending}
          onOpenCancel={setCancelModalTarget}
          onOpenDirectEnroll={(student) => {
            setDirectEnrollTarget(student);
            setDirectEnrollCourseId(teacherCourses[0]?.id || "");
          }}
        />
      </div>

      {/* Receipt Image Viewer Modal */}
      <CourseReceiptModal
        selectedReceipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onApprove={(id) => approveMutation.mutate(id)}
        isApprovePending={approveMutation.isPending}
        onOpenRejectModal={setRejectTarget}
        onOpenCancelModal={setCancelModalTarget}
      />

      {/* Reject, Cancel, Direct Enroll Action Modals */}
      <CourseEnrollmentActionModals
        rejectTarget={rejectTarget}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        onCloseRejectModal={() => {
          setRejectTarget(null);
          setRejectionReason("");
        }}
        onConfirmReject={() => {
          if (rejectTarget) {
            rejectMutation.mutate({
              id: rejectTarget.enrollmentId,
              reason: rejectionReason.trim(),
            });
          }
        }}
        isRejectPending={rejectMutation.isPending}
        cancelModalTarget={cancelModalTarget}
        cancellationReason={cancellationReason}
        setCancellationReason={setCancellationReason}
        onCloseCancelModal={() => {
          setCancelModalTarget(null);
          setCancellationReason("");
        }}
        onConfirmCancel={() => {
          if (cancelModalTarget) {
            cancelMutation.mutate({
              id: cancelModalTarget.enrollmentId,
              reason: cancellationReason.trim(),
            });
          }
        }}
        isCancelPending={cancelMutation.isPending}
        directEnrollTarget={directEnrollTarget}
        directEnrollCourseId={directEnrollCourseId}
        setDirectEnrollCourseId={setDirectEnrollCourseId}
        teacherCourses={teacherCourses}
        onCloseDirectEnrollModal={() => {
          setDirectEnrollTarget(null);
          setDirectEnrollCourseId("");
        }}
        onConfirmDirectEnroll={() => {
          if (directEnrollTarget && directEnrollCourseId) {
            directEnrollMutation.mutate({
              courseId: directEnrollCourseId,
              studentId: directEnrollTarget.studentId,
            });
          }
        }}
        isDirectEnrollPending={directEnrollMutation.isPending}
      />
    </div>
  );
}
