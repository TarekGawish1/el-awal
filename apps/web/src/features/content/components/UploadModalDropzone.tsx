'use client';

import React from 'react';
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  FileText,
  FileCode,
} from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface UploadModalDropzoneProps {
  file: File | null;
  filePreviewUrl: string | null;
  fileCategory: 'image' | 'video' | 'audio' | 'pdf' | 'other';
  fileError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFile: (file: File | null) => void;
  isPending: boolean;
  uploadProgress: number;
  loadedBytes: number;
  totalBytes: number;
  uploadStage: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
}

export function UploadModalDropzone({
  file,
  filePreviewUrl,
  fileCategory,
  fileError,
  fileInputRef,
  handleFileChange,
  setFile,
  isPending,
  uploadProgress,
  loadedBytes,
  totalBytes,
  uploadStage,
}: UploadModalDropzoneProps) {
  const getFileCategoryIcon = () => {
    switch (fileCategory) {
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
    <div>
      <Label className="mb-2 block text-sm font-bold text-slate-700">
        الملف المرفق (صورة، فيديو، مذكرة PDF) <span className="text-red-500">*</span>
      </Label>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            fileError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80'
          }`}
          onClick={() => !isPending && fileInputRef.current?.click()}
        >
          <UploadCloud className={`w-10 h-10 mx-auto mb-2 ${fileError ? 'text-red-400' : 'text-primary-500'}`} />
          <p className="text-sm font-bold text-slate-700 mb-1">اضغط لاختيار صورة، فيديو، أو ملف من جهازك</p>
          <p className="text-xs text-slate-500 mb-2">
            الحد الأقصى: 100 ميجابايت (صور JPG/PNG/WebP، فيديو MP4، PDF، صوت، Word)
          </p>

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
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              {fileCategory === 'image' && filePreviewUrl ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreviewUrl} alt="معاينة الصورة" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                  {getFileCategoryIcon()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
                    {fileCategory === 'image'
                      ? 'صورة'
                      : fileCategory === 'video'
                      ? 'فيديو'
                      : fileCategory === 'audio'
                      ? 'صوت'
                      : fileCategory === 'pdf'
                      ? 'PDF'
                      : 'مستند'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>

            {!isPending && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                title="إزالة الملف"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Real-time Upload Progress Bar */}
          {isPending && (
            <div className="pt-2">
              <ProgressBar
                progress={uploadProgress}
                loadedBytes={loadedBytes}
                totalBytes={totalBytes}
                stage={uploadStage}
                fileName={file.name}
                fileType={file.type}
                statusMessage={
                  uploadStage === 'processing'
                    ? 'تم إرسال الملف! جاري الحفظ والمعالجة السحابية على الخادم...'
                    : fileCategory === 'video'
                    ? `جاري رفع الفيديو... ${uploadProgress}%`
                    : fileCategory === 'image'
                    ? `جاري رفع الصورة... ${uploadProgress}%`
                    : `جاري رفع الملف... ${uploadProgress}%`
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
