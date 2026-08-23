'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle2, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface FileUploadZoneProps {
  accept?: string;
  folder?: string;
  label?: string;
  description?: string;
  currentFileUrl?: string | null;
  onUploadComplete: (result: {
    fileUrl: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    fileName: string;
  }) => void;
  onRemoveFile?: () => void;
  fileCategory?: 'image' | 'document';
}

export function FileUploadZone({
  accept = 'image/*',
  folder = 'courses',
  label = 'رفع صورة الغلاف',
  description = 'اسحب وأفلت الملف هنا، أو انقر للاختيار من جهازك',
  currentFileUrl,
  onUploadComplete,
  onRemoveFile,
  fileCategory = 'image',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(10);

      const mimeType = file.type || (fileCategory === 'image' ? 'image/jpeg' : 'application/pdf');

      // Step 1: Request presigned upload URL from backend
      const presignedRes = await apiClient<{
        uploadUrl: string;
        publicUrl: string;
        fileKey: string;
        expiresInSeconds: number;
      }>('/content/presigned-upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          contentType: mimeType,
          fileType: mimeType,
          fileSizeBytes: file.size,
          folder: folder || 'courses',
        }),
      });

      const { uploadUrl, publicUrl, fileKey } = presignedRes;
      setProgress(30);

      // Step 2: Upload raw binary directly to secure cloud storage
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 60) + 30;
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);
          setIsUploading(false);
          toast.success('تم رفع الملف وحفظه بنجاح');
          onUploadComplete({
            fileUrl: publicUrl,
            fileKey,
            fileSize: file.size,
            fileType: mimeType,
            fileName: file.name,
          });
        } else {
          setIsUploading(false);
          toast.error('تعذر إتمام رفع الملف');
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        toast.error('حدث خطأ أثناء نقل الملف');
      };

      xhr.send(file);
    } catch (err: any) {
      setIsUploading(false);
      toast.error(err?.message || 'تعذر إنشاء رابط الرفع المباشر');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2 text-right">
      {label && <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">{label}</label>}

      {currentFileUrl ? (
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {fileCategory === 'image' ? (
              <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                <img src={currentFileUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 dark:border-blue-800/40">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 text-right">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تم رفع الملف بنجاح</span>
              </div>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-block mt-0.5"
              >
                معاينة الملف المرفوع
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
            >
              تغيير الملف
            </button>
            {onRemoveFile && (
              <button
                type="button"
                onClick={onRemoveFile}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                title="إزالة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={onInputChange}
            disabled={isUploading}
            className="hidden"
          />

          {isUploading ? (
            <div className="w-full max-w-xs space-y-2 py-2">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>جاري رفع الملف إلى الخادم السحابي المشفر...</span>
                <span className="font-mono text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                {fileCategory === 'image' ? (
                  <ImageIcon className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{description}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {fileCategory === 'image'
                    ? 'الصور المدعومة (صورة عالية الدقة) حتى 10 ميجابايت'
                    : 'المستندات المدعومة (ملفات الشرح، التمارين، أوراق العمل) حتى 50 ميجابايت'}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
