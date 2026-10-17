'use client';

import React from 'react';
import { X, Settings2 } from 'lucide-react';
import { CourseDetail } from '../types/courses.types';
import { useEditCourseModalState } from '../hooks/useEditCourseModalState';
import { CourseBasicInfoSection } from './edit-course/CourseBasicInfoSection';
import { CoursePricingSection } from './edit-course/CoursePricingSection';
import { CourseMediaSection } from './edit-course/CourseMediaSection';
import { CourseSettingsSection } from './edit-course/CourseSettingsSection';

export interface EditCourseModalProps {
  isOpen: boolean;
  course: CourseDetail;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditCourseModal({ isOpen, course, onClose, onSuccess }: EditCourseModalProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    subject,
    setSubject,
    academicStage,
    gradeLevel,
    setGradeLevel,
    academicTerm,
    setAcademicTerm,
    academicYear,
    setAcademicYear,
    isFreeCourse,
    setIsFreeCourse,
    price,
    setPrice,
    coverImageUrl,
    setCoverImageUrl,
    coverImageKey,
    setCoverImageKey,
    previewVideoUrl,
    courseQuizId,
    setCourseQuizId,
    hasCertificate,
    setHasCertificate,
    enforceSequentialLessons,
    setEnforceSequentialLessons,
    isUploadingVideo,
    backgroundUploadTask,
    assessments,
    newUploadedKeyRef,
    isPending,
    handleStageChange,
    handleDirectVideoUpload,
    handleCancelVideoUpload,
    handleRemovePreviewVideo,
    handleCancel,
    handleSubmit,
  } = useEditCourseModalState({
    isOpen,
    course,
    onClose,
    onSuccess,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">تعديل بيانات وإعدادات الكورس</h2>
              <p className="text-xs text-slate-500">تعديل الاسم، المرحلة الدراسية، والأسعار والتفاصيل</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form - Scrollable */}
        <form
          id="edit-course-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 text-right bg-white flex-1"
        >
          <CourseBasicInfoSection
            title={title}
            setTitle={setTitle}
            academicStage={academicStage}
            handleStageChange={handleStageChange}
            gradeLevel={gradeLevel}
            setGradeLevel={setGradeLevel}
            subject={subject}
            setSubject={setSubject}
            academicTerm={academicTerm}
            setAcademicTerm={setAcademicTerm}
            academicYear={academicYear}
            setAcademicYear={setAcademicYear}
            description={description}
            setDescription={setDescription}
          />

          <CoursePricingSection
            isFreeCourse={isFreeCourse}
            setIsFreeCourse={setIsFreeCourse}
            price={price}
            setPrice={setPrice}
          />

          <CourseMediaSection
            coverImageUrl={coverImageUrl}
            coverImageKey={coverImageKey}
            setCoverImageUrl={setCoverImageUrl}
            setCoverImageKey={setCoverImageKey}
            newUploadedKeyRef={newUploadedKeyRef}
            previewVideoUrl={previewVideoUrl}
            isUploadingVideo={isUploadingVideo}
            backgroundUploadTask={backgroundUploadTask}
            handleDirectVideoUpload={handleDirectVideoUpload}
            handleCancelVideoUpload={handleCancelVideoUpload}
            handleRemovePreviewVideo={handleRemovePreviewVideo}
          />

          <CourseSettingsSection
            enforceSequentialLessons={enforceSequentialLessons}
            setEnforceSequentialLessons={setEnforceSequentialLessons}
            hasCertificate={hasCertificate}
            setHasCertificate={setHasCertificate}
            courseQuizId={courseQuizId}
            setCourseQuizId={setCourseQuizId}
            assessments={assessments}
          />
        </form>

        {/* Footer Actions - Fixed */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="edit-course-form"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
