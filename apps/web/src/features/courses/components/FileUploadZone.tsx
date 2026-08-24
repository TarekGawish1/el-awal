'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, File, Image as ImageIcon, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { coursesApi } from '../api/courses.api';
import { API_BASE_URL } from '@/lib/api/endpoints';
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
  description = 'اسحب وأفلت الملف هنا، أو انقر للاختيار من جهازك',
  currentFileUrl,
  fileCategory = 'document',
  maxSizeBytes = 50 * 1024 * 1024,
  onUploadComplete,
  onRemoveFile,
}: FileUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performDirectFallbackUpload = async (file: File) => {
    try {
      const directResult = await coursesApi.uploadDirectFile(file, folder, (percent) => {
        setUploadProgress(percent);
      });

      setIsUploading(false);
      setUploadProgress(100);
      onUploadComplete({
        fileUrl: directResult.fileUrl,
        fileKey: directResult.fileKey,
        fileSize: directResult.fileSize || file.size,
        fileType: directResult.fileType || file.type,
        fileName: directResult.fileName || file.name,
      });
      toast.success('تم رفع الملف بنجاح');
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(err?.message || 'تعذر رفع الملف، يرجى المحاولة مجدداً');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      toast.error(`حجم الملف يتجاوز الحد المسموح (${Math.round(maxSizeBytes / (1024 * 1024))} ميجابايت)`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(15);

      const mimeType = file.type || 'application/octet-stream';
      const presigned = await coursesApi.getPresignedUploadUrl({
        fileName: file.name,
        contentType: mimeType,
        fileType: mimeType,
        fileSizeBytes: file.size,
        folder,
      });

      // If presigned URL is invalid, empty, or internal fallback route, use direct multipart upload
      const isValidExternalUrl =
        presigned?.uploadUrl &&
        presigned.uploadUrl.startsWith('http') &&
        !presigned.uploadUrl.includes('https://.r2');

      if (!isValidExternalUrl) {
        await performDirectFallbackUpload(file);
        return;
      }

      setUploadProgress(35);

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presigned.uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 60) + 35;
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
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
          // Direct fallback if presigned PUT returned non-2xx
          await performDirectFallbackUpload(file);
        }
      };

      xhr.onerror = async () => {
        // Direct fallback if presigned PUT had network / CORS error
        await performDirectFallbackUpload(file);
      };

      xhr.send(file);
    } catch {
      // Direct fallback if presigned initialization failed
      await performDirectFallbackUpload(file);
    }
  };

  const resolvedFileUrl =
    currentFileUrl && (currentFileUrl.startsWith('http') || currentFileUrl.startsWith('data:') || currentFileUrl.startsWith('blob:'))
      ? currentFileUrl
      : currentFileUrl
        ? `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${currentFileUrl.startsWith('/') ? '' : '/'}${currentFileUrl}`
        : '';

  return (
    <div className="space-y-1.5 text-right">
      <label className="block text-xs font-bold text-slate-800">{label}</label>

      {currentFileUrl ? (
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            {fileCategory === 'image' ? (
              <img
                src={resolvedFileUrl}
                alt="معاينة الملف"
                className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0 border border-primary-100">
                <File className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">تم رفع الملف بنجاح</p>
              <a
                href={resolvedFileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary-600 hover:underline block truncate font-medium mt-0.5"
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
                className="px-3.5 py-1.5 text-xs text-slate-700 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white font-medium shadow-sm"
              >
                تغيير الملف
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-blue-200 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-blue-50/20 hover:bg-blue-50/40 group shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2 text-slate-600">
            {isUploading ? (
              <Loader2 className="w-9 h-9 text-primary-600 animate-spin mb-1" />
            ) : fileCategory === 'image' ? (
              <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <ImageIcon className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
            )}

            <p className="text-xs font-bold text-slate-800">{description}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              الحد الأقصى {Math.round(maxSizeBytes / (1024 * 1024))} ميجابايت • رفع سحابي مباشر
            </p>
          </div>

          {isUploading && (
            <div className="mt-4 space-y-1.5 max-w-xs mx-auto">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>جاري الرفع...</span>
                <span className="font-mono text-primary-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
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
