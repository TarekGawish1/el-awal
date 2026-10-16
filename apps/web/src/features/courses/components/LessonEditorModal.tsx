"use client";

import React from "react";
import {
  X,
  Video,
  FileText,
  Paperclip,
  Award,
  Loader2,
} from "lucide-react";
import {
  LessonEditorModalProps,
} from "../types/lesson-editor.types";
import { useLessonEditor } from "../hooks/useLessonEditor";
import {
  LessonVideoSection,
  LessonSettingsSection,
  LessonAttachmentsSection,
  LessonQuizSection,
} from "./lesson-editor";

export function LessonEditorModal(props: LessonEditorModalProps) {
  const { isOpen } = props;
  const editor = useLessonEditor(props);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Video className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">
                {editor.isEditing
                  ? "تعديل محتوى وتفاصيل الدرس"
                  : "إضافة درس تعليمي جديد"}
              </h2>
              <p className="text-xs text-slate-500">
                إعداد الشرح، الفيديو، الملخصات والاختبارات التفاعلية
              </p>
            </div>
          </div>
          <button
            onClick={editor.handleCancel}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Pill Tab Navigation */}
        <div className="px-6 pt-4 pb-2 bg-white">
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => editor.setActiveTab("video")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                editor.activeTab === "video"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>الفيديو والشرح</span>
            </button>

            <button
              type="button"
              onClick={() => editor.setActiveTab("summary")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                editor.activeTab === "summary"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>الملخص والملاحظات</span>
            </button>

            <button
              type="button"
              onClick={() => editor.setActiveTab("attachments")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                editor.activeTab === "attachments"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>المرفقات والملخصات</span>
              {editor.attachments.length > 0 && (
                <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {editor.attachments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => editor.setActiveTab("quiz")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all ${
                editor.activeTab === "quiz"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>الاختبار والواجب</span>
              {(editor.lessonQuizId || editor.lessonHomeworkId) && (
                <span className="bg-white/25 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {(editor.lessonQuizId ? 1 : 0) + (editor.lessonHomeworkId ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="p-6 overflow-y-auto space-y-4 text-right flex-1 bg-white">
          {editor.activeTab === "video" && (
            <LessonVideoSection
              title={editor.title}
              setTitle={editor.setTitle}
              description={editor.description}
              setDescription={editor.setDescription}
              bunnyVideoId={editor.bunnyVideoId}
              videoEmbedUrl={editor.videoEmbedUrl}
              uploadedVideoName={editor.uploadedVideoName}
              isUploadingVideo={editor.isUploadingVideo}
              isInspectingVideo={editor.isInspectingVideo}
              videoUploadProgress={editor.videoUploadProgress}
              uploadSpeedMbps={editor.uploadSpeedMbps}
              uploadedBytes={editor.uploadedBytes}
              totalBytes={editor.totalBytes}
              etaSeconds={editor.etaSeconds}
              videoMeta={editor.videoMeta}
              streamAuth={editor.streamAuth}
              backgroundUploadTask={editor.backgroundUploadTask}
              videoDurationSeconds={editor.videoDurationSeconds}
              setVideoDurationSeconds={editor.setVideoDurationSeconds}
              isFreePreview={editor.isFreePreview}
              setIsFreePreview={editor.setIsFreePreview}
              handleDirectVideoUpload={editor.handleDirectVideoUpload}
              handleCancelUpload={editor.handleCancelUpload}
              handleRemoveVideo={editor.handleRemoveVideo}
            />
          )}

          {editor.activeTab === "summary" && (
            <LessonSettingsSection
              summary={editor.summary}
              setSummary={editor.setSummary}
            />
          )}

          {editor.activeTab === "attachments" && (
            <LessonAttachmentsSection
              attachments={editor.attachments}
              isAddingAttachment={editor.isAddingAttachment}
              setIsAddingAttachment={editor.setIsAddingAttachment}
              newAttachmentTitle={editor.newAttachmentTitle}
              setNewAttachmentTitle={editor.setNewAttachmentTitle}
              newAttachmentUrl={editor.newAttachmentUrl}
              setNewAttachmentUrl={editor.setNewAttachmentUrl}
              newAttachmentKey={editor.newAttachmentKey}
              setNewAttachmentKey={editor.setNewAttachmentKey}
              newAttachmentSize={editor.newAttachmentSize}
              setNewAttachmentSize={editor.setNewAttachmentSize}
              newAttachmentType={editor.newAttachmentType}
              setNewAttachmentType={editor.setNewAttachmentType}
              handleAddAttachment={editor.handleAddAttachment}
              handleDeleteAttachment={editor.handleDeleteAttachment}
              isAddingAttachmentLoading={editor.isAddingAttachmentLoading}
            />
          )}

          {editor.activeTab === "quiz" && (
            <LessonQuizSection
              lessonQuizId={editor.lessonQuizId}
              setLessonQuizId={editor.setLessonQuizId}
              lessonHomeworkId={editor.lessonHomeworkId}
              setLessonHomeworkId={editor.setLessonHomeworkId}
              allowMultipleAttempts={editor.allowMultipleAttempts}
              setAllowMultipleAttempts={editor.setAllowMultipleAttempts}
              allowHomeworkMultipleAttempts={editor.allowHomeworkMultipleAttempts}
              setAllowHomeworkMultipleAttempts={editor.setAllowHomeworkMultipleAttempts}
              isQuizOptional={editor.isQuizOptional}
              setIsQuizOptional={editor.setIsQuizOptional}
              isHomeworkOptional={editor.isHomeworkOptional}
              setIsHomeworkOptional={editor.setIsHomeworkOptional}
              isQuizPassRequired={editor.isQuizPassRequired}
              setIsQuizPassRequired={editor.setIsQuizPassRequired}
              isHomeworkPassRequired={editor.isHomeworkPassRequired}
              setIsHomeworkPassRequired={editor.setIsHomeworkPassRequired}
              examOptions={editor.examOptions}
              homeworkOptions={editor.homeworkOptions}
              newAssessmentId={props.newAssessmentId}
              isSavingAndRedirecting={editor.isSavingAndRedirecting}
              handleSaveAndCreateAssessment={editor.handleSaveAndCreateAssessment}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <button
            type="button"
            onClick={editor.handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={editor.handleSaveLesson}
            disabled={
              editor.isSaving ||
              editor.isUploadingVideo ||
              (!editor.bunnyVideoId &&
                !editor.backgroundUploadTask?.videoId &&
                !editor.videoEmbedUrl &&
                !editor.streamAuth?.videoId)
            }
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {(editor.isSaving || editor.isUploadingVideo) && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>
              {editor.isUploadingVideo
                ? "جاري رفع الفيديو..."
                : editor.isEditing
                ? "حفظ التعديلات"
                : "إضافة الدرس للمنهج"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
