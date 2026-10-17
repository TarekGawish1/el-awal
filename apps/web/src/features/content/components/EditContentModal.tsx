'use client';

import React from 'react';
import {
  X,
  Edit,
  UploadCloud,
  FileText,
  Loader2,
  RefreshCw,
  FileDown,
  Check,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  FileCode,
} from 'lucide-react';
import { ContentType, EducationalContent } from '../types/content.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useEditContentModalState } from '../hooks/useEditContentModalState';
import { ContentScopeSection } from './ContentScopeSection';

export interface EditContentModalProps {
  isOpen: boolean;
  content: EducationalContent | null;
  onClose: () => void;
}

export function EditContentModal({ isOpen, content, onClose }: EditContentModalProps) {
  const {
    replacementFile,
    setReplacementFile,
    replacementPreviewUrl,
    replacementCategory,
    fileError,
    setFileError,
    isReplacingFile,
    setIsReplacingFile,
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
  } = useEditContentModalState({
    isOpen,
    content,
    onClose,
  });

  if (!isOpen || !content) return null;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'غير معروف';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  const getReplacementCategoryIcon = () => {
    switch (replacementCategory) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'video':
        return <VideoIcon className="w-5 h-5 text-rose-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileCode className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">تعديل بيانات المرفق</h2>
              <p className="text-xs text-slate-500">
                تحديث العنوان، نطاق المشاركة، أو استبدال الملف المرفوع
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
          <form id="edit-content-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title and Content Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-sm font-bold text-slate-700">
                  عنوان الملف / المذكرة <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register('title')}
                  placeholder="مثال: مذكرة مراجعة ليلة الامتحان"
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

            {/* Current File and Optional Replacement */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-3">
              <Label className="block text-xs font-bold text-slate-700">الملف المرفوع حالياً:</Label>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-primary-50 text-primary-600 p-2 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {(content as any).originalFileName || content.title || 'الملف المرفق'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      الحجم: {formatFileSize(content.fileSize || (content as any).fileSizeBytes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {content.fileUrl && (
                    <a
                      href={content.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="تحميل / معاينة الملف الأصلي"
                    >
                      <FileDown className="w-4 h-4" />
                    </a>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsReplacingFile(!isReplacingFile);
                      if (isReplacingFile) {
                        setReplacementFile(null);
                        setFileError(null);
                      }
                    }}
                    className="text-xs font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5 ml-1" />
                    {isReplacingFile ? 'إلغاء التغيير' : 'استبدال الملف'}
                  </Button>
                </div>
              </div>

              {/* Replacement Dropzone */}
              {isReplacingFile && (
                <div className="pt-2 animate-in fade-in duration-200">
                  <Label className="mb-2 block text-xs font-bold text-slate-700">
                    اختر الملف الجديد البديل (صورة، فيديو، مستند، أو PDF):
                  </Label>

                  {!replacementFile ? (
                    <div
                      className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
                        fileError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => !isPending && fileInputRef.current?.click()}
                    >
                      <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${fileError ? 'text-red-400' : 'text-primary-500'}`} />
                      <p className="text-xs font-bold text-slate-700 mb-1">اضغط لاختيار الملف الجديد</p>
                      <p className="text-[11px] text-slate-400">الحد الأقصى: 100 ميجابايت</p>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.mp4,.webm,.mov"
                        disabled={isPending}
                      />

                      {fileError && <p className="text-red-500 text-xs font-bold mt-2">{fileError}</p>}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {replacementCategory === 'image' && replacementPreviewUrl ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={replacementPreviewUrl} alt="معاينة" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="bg-primary/10 text-primary w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                              {getReplacementCategoryIcon()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{replacementFile.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {(replacementFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplacementFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isPending && (
                        <ProgressBar
                          progress={uploadProgress}
                          loadedBytes={loadedBytes}
                          totalBytes={totalBytes}
                          stage={uploadStage}
                          fileName={replacementFile.name}
                          fileType={replacementFile.type}
                          statusMessage={
                            uploadStage === 'processing'
                              ? 'جاري حفظ الملف الجديد سحابياً...'
                              : `جاري رفع الملف الجديد... ${uploadProgress}%`
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1 block text-sm font-bold text-slate-700">ملاحظات أو وصف إضافي (اختياري)</Label>
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
                جاري تحديث المرفق...
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              form="edit-content-form"
              disabled={isPending}
              className="shadow-md shadow-primary/20 min-w-[140px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {uploadStage === 'processing' ? 'جاري الحفظ...' : `جاري الرفع (${uploadProgress}%)`}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  حفظ التعديلات
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
