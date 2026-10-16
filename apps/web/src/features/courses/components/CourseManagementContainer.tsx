"use client";

import React from "react";
import { Video, Plus, BookOpen, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCourseManagement } from "../hooks/useCourseManagement";
import {
  CourseStatsCards,
  CourseCatalogFilterBar,
  CourseCatalogGrid,
  CourseEnrollmentsView,
} from "./management";
import { CreateCourseModal } from "./CreateCourseModal";
import { EditCourseModal } from "./EditCourseModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function CourseManagementContainer() {
  const router = useRouter();
  const m = useCourseManagement();

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Video className="w-5 h-5" />
            </div>
            <span>الكورسات والدورات التدريبية أونلاين</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة المناهج المصورة، الفصول والوحدات، ملخصات الشرح والاختبارات التفاعلية
          </p>
        </div>

        <button
          type="button"
          onClick={() => m.setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كورس جديد</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <CourseStatsCards
        totalCourses={m.totalCourses}
        publishedCourses={m.publishedCourses}
        totalLessons={m.totalLessons}
        totalEnrollments={m.totalEnrollments}
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => m.setActiveTab("COURSES")}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            m.activeTab === "COURSES"
              ? "border-primary-600 text-primary-600 bg-primary-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المناهج والكورسات</span>
        </button>
        <button
          onClick={() => m.setActiveTab("ENROLLMENTS")}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            m.activeTab === "ENROLLMENTS"
              ? "border-primary-600 text-primary-600 bg-primary-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الاشتراكات والطلبات الأونلاين</span>
          {m.pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
              {m.pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Courses Catalog */}
      {m.activeTab === "COURSES" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <CourseCatalogFilterBar
            searchTerm={m.searchTerm}
            setSearchTerm={m.setSearchTerm}
            selectedGrade={m.selectedGrade}
            setSelectedGrade={m.setSelectedGrade}
            selectedStatus={m.selectedStatus}
            setSelectedStatus={m.setSelectedStatus}
          />

          <CourseCatalogGrid
            isLoading={m.isLoading}
            filteredCourses={m.filteredCourses}
            onEditCourse={m.setCourseToEdit}
            onRequestDeleteCourse={m.setCourseToDelete}
          />
        </div>
      )}

      {/* Tab 2: Online Enrollments Suite */}
      {m.activeTab === "ENROLLMENTS" && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <CourseEnrollmentsView />
        </div>
      )}

      {/* Create Course Modal */}
      {m.isCreateModalOpen && (
        <CreateCourseModal
          isOpen={m.isCreateModalOpen}
          onClose={() => m.setIsCreateModalOpen(false)}
          onSuccess={(newId) => router.push(`/teacher/courses/${newId}`)}
        />
      )}

      {/* Edit Course Modal */}
      {m.courseToEdit && (
        <EditCourseModal
          isOpen={Boolean(m.courseToEdit)}
          course={m.courseToEdit}
          onClose={() => m.setCourseToEdit(null)}
        />
      )}

      {/* Custom Confirmation Dialog for Course Deletion */}
      <ConfirmModal
        isOpen={Boolean(m.courseToDelete)}
        title="تأكيد حذف الكورس"
        message={`هل أنت متأكد من حذف كورس "${m.courseToDelete?.title}" نهائياً وجميع الفصول والدروس التابعة له؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف الكورس نهائياً"
        cancelText="إلغاء وتراجع"
        variant="danger"
        isLoading={m.deleteMutation.isPending}
        onConfirm={() => {
          if (m.courseToDelete) {
            m.deleteMutation.mutate(m.courseToDelete.id);
            m.setCourseToDelete(null);
          }
        }}
        onClose={() => m.setCourseToDelete(null)}
      />
    </div>
  );
}
