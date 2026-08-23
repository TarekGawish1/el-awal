'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Loader2, CheckCircle2, X } from 'lucide-react';
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
  fileCategory?: 'image' | 'pdf';
}

export function FileUploadZone({
  accept = 'image/*',
  folder = 'courses/covers',
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

      // Step 1: Request presigned PUT URL from backend
      const presignedRes = await apiClient<{
        uploadUrl: string;
        publicUrl: string;
        fileKey: string;
        expiresInSeconds: number;
      }>('/content/presigned-upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || (fileCategory === 'image' ? 'image/jpeg' : 'application/pdf'),
          folder,
        }),
      });

      const { uploadUrl, publicUrl, fileKey } = presignedRes;
      setProgress(30);

      // Step 2: Upload raw binary directly to Cloudflare R2
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

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
          toast.success('تم رفع الملف بنجاح إلى التخزين السحابي');
          onUploadComplete({
            fileUrl: publicUrl,
            fileKey,
            fileSize: file.size,
            fileType: file.type,
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
    } catch {
      setIsUploading(false);
      toast.error('تعذر إنشاء رابط الرفع المباشر');
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
    <div className="space-y-2">
      {label && <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>}

      {currentFileUrl ? (
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {fileCategory === 'image' ? (
              <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                <img src={currentFileUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                تم رفع الملف بنجاح
              </p>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
              >
                معاينة الملف المرفوع
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              تغيير
            </button>
            {onRemoveFile && (
              <button
                type="button"
                onClick={onRemoveFile}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
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
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900'
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
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>جاري نقل ورفع الملف إلى السحابة...</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                {fileCategory === 'image' ? (
                  <ImageIcon className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{description}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {fileCategory === 'image' ? 'PNG, JPG, WEBP حتى 10 ميجابايت' : 'ملفات PDF حتى 50 ميجابايت'}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
