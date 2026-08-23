'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, File, Image as ImageIcon, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { coursesApi } from '../api/courses.api';
import toast from 'react-hot-toast';

interface FileUploadZoneProps {
  accept?: string;
  folder?: string;
  label: string;
  description?: string;
  currentFileUrl?: string | null;
  fileCategory?: 'image' | 'document' | 'video';
  maxSizeBytes?: number;
  onUploadComplete: (result: {
    fileUrl: string;
    fileKey: string;
    fileSize?: number;
    fileType?: string;
    fileName: string;
  }) => void;
  onRemoveFile?: () => void;
}

export function FileUploadZone({
  accept = 'image/*,.pdf,.docx',
  folder = 'courses',
  label,
  description = 'اسحب وأفلت الملف هنا أو انقر للاختيار',
  currentFileUrl,
  fileCategory = 'document',
  maxSizeBytes = 50 * 1024 * 1024,
  onUploadComplete,
  onRemoveFile,
}: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      toast.error(`حجم الملف يتجاوز الحد المسموح (${Math.round(maxSizeBytes / (1024 * 1024))}MB)`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const mimeType = file.type || 'application/octet-stream';
      const presigned = await coursesApi.getPresignedUploadUrl({
        fileName: file.name,
        contentType: mimeType,
        fileType: mimeType,
        fileSizeBytes: file.size,
        folder,
      });

      setUploadProgress(30);

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presigned.uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 65) + 30;
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          setIsUploading(false);
          onUploadComplete({
            fileUrl: presigned.publicUrl,
            fileKey: presigned.fileKey,
            fileSize: file.size,
            fileType: mimeType,
            fileName: file.name,
          });
          toast.success('تم رفع الملف بنجاح');
        } else {
          setIsUploading(false);
          toast.error('تعذر إتمام رفع الملف');
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        toast.error('حدث خطأ في الاتصال أثناء الرفع');
      };

      xhr.send(file);
    } catch {
      setIsUploading(false);
      toast.error('تعذر إنشاء رابط الرفع المباشر');
    }
  };

  return (
    <div className="space-y-1.5 text-right">
      <label className="block text-xs font-bold text-slate-800">{label}</label>

      {currentFileUrl ? (
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            {fileCategory === 'image' ? (
              <img
                src={currentFileUrl}
                alt="معاينة الملف"
                className="w-12 h-12 object-cover rounded-lg border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                <File className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">تم رفع الملف بنجاح</p>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary-600 hover:underline block truncate"
              >
                معاينة الملف المرفوع
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRemoveFile && (
              <button
                type="button"
                onClick={onRemoveFile}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
              >
                تغيير الملف
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-white group shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-1.5 text-slate-500">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-1" />
            ) : fileCategory === 'image' ? (
              <ImageIcon className="w-8 h-8 text-primary-600 group-hover:scale-110 transition-transform mb-1" />
            ) : (
              <UploadCloud className="w-8 h-8 text-primary-600 group-hover:scale-110 transition-transform mb-1" />
            )}

            <p className="text-xs font-bold text-slate-800">{description}</p>
            <p className="text-[10px] text-slate-400">
              الحد الأقصى {Math.round(maxSizeBytes / (1024 * 1024))} ميجابايت • رفع مباشر وسريع
            </p>
          </div>

          {isUploading && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-800">
                <span>جاري الرفع السحابي...</span>
                <span className="font-mono text-primary-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary-600 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
