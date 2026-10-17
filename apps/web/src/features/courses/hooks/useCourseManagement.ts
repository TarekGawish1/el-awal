"use client";

import { useState, useMemo } from "react";
import { useTeacherCourses, useDeleteCourse, useTeacherSubscriptions } from "./useCourses";
import { getRealtimeSocket } from "@/lib/realtime/socket";
import { useRealtimeCourseSubscriptions } from "@/lib/realtime/useRealtimeCourseSubscriptions";
import { CourseDetail } from "../types/courses.types";

export function useCourseManagement() {
  const { data: rawCourses, isLoading } = useTeacherCourses();
  const deleteMutation = useDeleteCourse();

  // Safely extract courses as an array under all possible API response structures
  const courses: CourseDetail[] = useMemo(() => {
    if (Array.isArray(rawCourses)) return rawCourses;
    if (rawCourses && Array.isArray((rawCourses as any).courses)) return (rawCourses as any).courses;
    if (rawCourses && Array.isArray((rawCourses as any).data)) return (rawCourses as any).data;
    return [];
  }, [rawCourses]);

  // Real-time subscriptions updates via WebSocket + throttled background safety poll (120s when connected)
  useRealtimeCourseSubscriptions();
  const { data: subsData } = useTeacherSubscriptions({
    refetchInterval: () => {
      const socket = getRealtimeSocket();
      return socket?.connected ? 120000 : 30000;
    },
  });
  const pendingCount = subsData?.counts?.pending ?? 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<CourseDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"COURSES" | "ENROLLMENTS">("COURSES");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Custom Delete Modal State
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);

  const filteredCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    return courses.filter((c: CourseDetail) => {
      if (!c) return false;
      const title = c.title || "";
      const subject = c.subject || "";
      const matchesSearch =
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGrade === "ALL" || c.gradeLevel === selectedGrade;
      const matchesStatus = selectedStatus === "ALL" || c.status === selectedStatus;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [courses, searchTerm, selectedGrade, selectedStatus]);

  // Overall Stats
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c: CourseDetail) => c?.status === "PUBLISHED").length;
  const totalEnrollments = courses.reduce((acc: number, c: CourseDetail) => acc + (c?._count?.enrollments || 0), 0);
  const totalLessons = courses.reduce((acc: number, c: CourseDetail) => acc + (c?.totalLessons || 0), 0);

  return {
    courses,
    isLoading,
    deleteMutation,
    pendingCount,
    isCreateModalOpen,
    setIsCreateModalOpen,
    courseToEdit,
    setCourseToEdit,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedGrade,
    setSelectedGrade,
    selectedStatus,
    setSelectedStatus,
    courseToDelete,
    setCourseToDelete,
    filteredCourses,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    totalLessons,
  };
}
