"use client";

import React from "react";
import {
  Paperclip,
  Plus,
  FileText,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { LessonAttachment } from "../../types/courses.types";
import { FileUploadZone } from "../FileUploadZone";
import { coursesApi } from "../../api/courses.api";

export interface LessonAttachmentsSectionProps {
  attachments: LessonAttachment[];
  isAddingAttachment: boolean;
  setIsAddingAttachment: (val: boolean) => void;
  newAttachmentTitle: string;
  setNewAttachmentTitle: (val: string) => void;
  newAttachmentUrl: string;
  setNewAttachmentUrl: (val: string) => void;
  newAttachmentKey: string;
  setNewAttachmentKey: (val: string) => void;
  newAttachmentSize?: number;
  setNewAttachmentSize: (val?: number) => void;
  newAttachmentType: string;
  setNewAttachmentType: (val: string) => void;
  handleAddAttachment: () => Promise<void>;
  handleDeleteAttachment: (att: LessonAttachment) => Promise<void>;
  isAddingAttachmentLoading: boolean;
}

export function LessonAttachmentsSection({
  attachments,
  isAddingAttachment,
  setIsAddingAttachment,
  newAttachmentTitle,
  setNewAttachmentTitle,
  newAttachmentUrl,
  setNewAttachmentUrl,
  newAttachmentKey,
  setNewAttachmentKey,
  newAttachmentSize,
  setNewAttachmentSize,
  newAttachmentType: _newAttachmentType,
  setNewAttachmentType,
  handleAddAttachment,
  handleDeleteAttachment,
  isAddingAttachmentLoading,
}: LessonAttachmentsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-primary-600" />
          الملفات والمذكرات المرفقة بالدرس
        </span>
        {!isAddingAttachment && (
          <button
            type="button"
            onClick={() => setIsAddingAttachment(true)}
            className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-primary-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة ملف جديد</span>
          </button>
        )}
      </div>

      {/* Add Attachment Dropzone Panel */}
      {isAddingAttachment && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              عنوان المرفق (مثال: ملخص الدرس، واجب تدريبي)
            </label>
            <input
              type="text"
              value={newAttachmentTitle}
              onChange={(e) => setNewAttachmentTitle(e.target.value)}
              placeholder="اكتب اسماً واضحاً للملف..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            />
          </div>

          {/* Direct Presigned Document Uploader */}
          <FileUploadZone
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            folder="courses"
            label="رفع الملف المرفق (مستند / ورقة عمل)"
            description="اسحب وأفلت الملف هنا للرفع السحابي الفوري"
            currentFileUrl={newAttachmentUrl}
            currentFileKey={newAttachmentKey}
            onUploadComplete={({
              fileUrl,
              fileKey,
              fileSize,
              fileType,
              fileName,
            }) => {
              setNewAttachmentUrl(fileUrl);
              setNewAttachmentKey(fileKey);
              setNewAttachmentSize(fileSize);
              setNewAttachmentType(fileType || "application/pdf");
              if (!newAttachmentTitle) {
                setNewAttachmentTitle(fileName.replace(/\.[^/.]+$/, ""));
              }
            }}
            onRemoveFile={() => {
              setNewAttachmentUrl("");
              setNewAttachmentKey("");
              setNewAttachmentSize(undefined);
            }}
            fileCategory="document"
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (newAttachmentKey || newAttachmentUrl) {
                  coursesApi.deleteUploadedFile(newAttachmentKey || newAttachmentUrl);
                }
                setNewAttachmentTitle("");
                setNewAttachmentUrl("");
                setNewAttachmentKey("");
                setNewAttachmentSize(undefined);
                setIsAddingAttachment(false);
              }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAddAttachment}
              disabled={isAddingAttachmentLoading || !newAttachmentUrl}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isAddingAttachmentLoading ? "جاري الحفظ..." : "حفظ المرفق"}
            </button>
          </div>
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            لا توجد ملفات مرفقة بهذا الدرس حالياً
          </p>
        ) : (
          attachments.map((att: LessonAttachment) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{att.title}</p>
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>تحميل / معاينة المستند</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteAttachment(att)}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                title="حذف المرفق"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
