'use client';

import React from 'react';
import { X, UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ContentType } from '../types/content.types';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { useUploadModalState } from '../hooks/useUploadModalState';
import { ContentScopeSection } from './ContentScopeSection';
import { UploadModalDropzone } from './UploadModalDropzone';

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGradeLevel?: string;
  initialGroupId?: string;
  initialSessionTopic?: string;
  initialSessionId?: string;
}

export function UploadModal({
  isOpen,
  onClose,
  initialGradeLevel,
  initialGroupId,
  initialSessionTopic,
  initialSessionId,
}: UploadModalProps) {
  const isOnline = useOnlineStatus();
  const {
    file,
    setFile,
    filePreviewUrl,
    fileCategory,
    fileError,
    fileInputRef,
    isPending,
    uploadProgress,
    loadedBytes,
    totalBytes,
    uploadStage,
    selectedStage,
    availableGrades,
    selectedTargetScope,
    selectedGradeLevel,
    filteredGroups,
    semesterSessions,
    dbTopics,
    selectedSessionId,
    sessionTopicValue,
    isLoadingSessions,
    activeYear,
    activeTerm,
    register,
    handleSubmit,
    errors,
    handleStageChange,
    handleGradeChange,
    handleLessonSelectChange,
    handleFileChange,
    handleClose,
    onSubmit,
  } = useUploadModalState({
    isOpen,
    onClose,
    initialGradeLevel,
    initialGroupId,
    initialSessionTopic,
    initialSessionId,
  });

  if (!isOpen) return null;

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="رفع المرفقات"
        description="رفع الفيديوهات والمرفقات التعليمية يتطلب اتصالاً نشطاً بالخادم."
        backHref="/teacher/content"
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">رفع مرفقات وملازم الحصص</h2>
              <p className="text-xs text-slate-500">
                إضافة ملفات ومذكرات تعليمية وفيديوهات وتخصيصها للحصص والمجموعات
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="upload-content-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <ContentScopeSection
              register={register}
              selectedStage={selectedStage}
              handleStageChange={handleStageChange}
              selectedGradeLevel={selectedGradeLevel}
              handleGradeChange={handleGradeChange}
              availableGrades={availableGrades}
              selectedTargetScope={selectedTargetScope}
              filteredGroups={filteredGroups}
              semesterSessions={semesterSessions}
              dbTopics={dbTopics}
              selectedSessionId={selectedSessionId}
              sessionTopicValue={sessionTopicValue}
              handleLessonSelectChange={handleLessonSelectChange}
              isLoadingSessions={isLoadingSessions}
              isPending={isPending}
              activeYear={activeYear}
              activeTerm={activeTerm}
            />

            <UploadModalDropzone
              file={file}
              filePreviewUrl={filePreviewUrl}
              fileCategory={fileCategory}
              fileError={fileError}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              setFile={setFile}
              isPending={isPending}
              uploadProgress={uploadProgress}
              loadedBytes={loadedBytes}
              totalBytes={totalBytes}
              uploadStage={uploadStage}
            />

            {/* Title and Content Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-sm font-bold text-slate-700">
                  عنوان الملف / المذكرة <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register('title')}
                  placeholder="مثال: مذكرة شرح وحل تدريبات الحصة الأولى"
                  className={errors.title ? 'border-red-500' : ''}
                  disabled={isPending}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-sm font-bold text-slate-700">
                  نوع المحتوى <span className="text-red-500">*</span>
                </Label>
                <select
                  {...register('contentType')}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-100"
                  disabled={isPending}
                >
                  <option value={ContentType.FILE}>ملف عام / ملزمة</option>
                  <option value={ContentType.SUMMARY}>ملخص دراسي</option>
                  <option value={ContentType.REFERENCE}>مرجع أو واجب إضافي</option>
                  <option value={ContentType.LECTURE_RECORDING}>تسجيل حصة (فيديو)</option>
                </select>
                {errors.contentType && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{errors.contentType.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1 block text-sm font-bold text-slate-700">
                ملاحظات أو وصف إضافي (اختياري)
              </Label>
              <Textarea
                {...register('description')}
                placeholder="أضف تعليمات للطلاب أو تفاصيل عن هذا المرفق..."
                rows={2}
                disabled={isPending}
                className="disabled:bg-slate-100"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs text-slate-500">
            {isPending && (
              <span className="flex items-center gap-1.5 text-primary-700 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                يرجى الانتظار حتى اكتمال الرفع...
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              form="upload-content-form"
              disabled={isPending || !file}
              className="shadow-md shadow-primary/20 min-w-[140px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {uploadStage === 'processing' ? 'جاري الحفظ...' : `جاري الرفع (${uploadProgress}%)`}
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 ml-2" />
                  رفع وحفظ المرفق
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
