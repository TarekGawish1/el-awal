'use client';

import React from 'react';
import {
  Video,
  Loader2,
  Gauge,
  Info,
  CheckCircle,
  UploadCloud,
  Trash2,
} from 'lucide-react';
import { FileUploadZone } from '../FileUploadZone';
import { formatVideoSize, formatEtaArabic } from '../../utils/video-optimizer';

interface CourseMediaSectionProps {
  coverImageUrl: string | null;
  coverImageKey: string | null;
  setCoverImageUrl: (url: string | null) => void;
  setCoverImageKey: (key: string | null) => void;
  newUploadedKeyRef: React.MutableRefObject<string | null>;
  previewVideoUrl: string;
  isUploadingVideo: boolean;
  backgroundUploadTask: any;
  handleDirectVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCancelVideoUpload: () => void;
  handleRemovePreviewVideo: () => void;
}

export function CourseMediaSection({
  coverImageUrl,
  coverImageKey,
  setCoverImageUrl,
  setCoverImageKey,
  newUploadedKeyRef,
  previewVideoUrl,
  isUploadingVideo,
  backgroundUploadTask,
  handleDirectVideoUpload,
  handleCancelVideoUpload,
  handleRemovePreviewVideo,
}: CourseMediaSectionProps) {
  return (
    <>
      {/* Direct Cover Upload Dropzone */}
      <div>
        <FileUploadZone
          accept="image/*"
          folder="courses"
          label="صورة غلاف الكورس (رفع مباشر)"
          description="اسحب وأفلت صورة الغلاف هنا، أو انقر للاختيار من جهازك"
          currentFileUrl={coverImageUrl}
          currentFileKey={coverImageKey}
          onUploadComplete={({ fileUrl, fileKey }) => {
            setCoverImageUrl(fileUrl);
            setCoverImageKey(fileKey);
            newUploadedKeyRef.current = fileKey || fileUrl;
          }}
          onRemoveFile={() => {
            setCoverImageUrl(null);
            setCoverImageKey(null);
          }}
          fileCategory="image"
        />
      </div>

      {/* Course Preview / Info Video */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Video className="w-4 h-4 text-primary-600" />
            <span>فيديو تعريفي / برومو الكورس (معاينة مجانية قبل الشراء)</span>
          </label>
          <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">
            اختياري
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          فيديو قصير تعريفي يشرح مميزات ومحتوى الكورس للطلاب قبل اتخاذ قرار الشراء أو الاشتراك (رفع مباشر إلى سيرفرات البث السحابي).
        </p>

        {/* 1. Upload in Progress Card */}
        {isUploadingVideo && backgroundUploadTask && (
          <div className="p-4 bg-white border border-primary-200 rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                {backgroundUploadTask.status === 'inspecting'
                  ? 'جاري فحص وتجهيز الفيديو والضغط السحابي...'
                  : 'جاري الرفع المباشر إلى سيرفرات البث السحابي (Bunny Stream)...'}
              </span>
              <span className="font-mono text-primary-600 text-sm">
                {backgroundUploadTask.progress}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${backgroundUploadTask.progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
              <div className="flex items-center gap-3">
                {backgroundUploadTask.totalBytes > 0 && (
                  <span>
                    تم رفع:{' '}
                    <strong className="text-slate-800 font-mono">
                      {formatVideoSize(backgroundUploadTask.uploadedBytes)}
                    </strong>{' '}
                    من{' '}
                    <strong className="text-slate-800 font-mono">
                      {formatVideoSize(backgroundUploadTask.totalBytes)}
                    </strong>
                  </span>
                )}
                {backgroundUploadTask.speedMbps > 0 && (
                  <span className="flex items-center gap-1 text-primary-600">
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="font-mono">{backgroundUploadTask.speedMbps} ميجابايت/ث</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {backgroundUploadTask.etaSeconds > 0 && (
                  <span className="text-slate-600">
                    الوقت المتبقي:{' '}
                    <strong className="text-slate-800">
                      {formatEtaArabic(backgroundUploadTask.etaSeconds)}
                    </strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCancelVideoUpload}
                  className="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-bold transition-colors cursor-pointer"
                >
                  إلغاء الرفع
                </button>
              </div>
            </div>

            <div className="bg-blue-50/80 border border-blue-100/90 rounded-xl p-2.5 text-center text-xs text-blue-800 flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">
                يستمر رفع الفيديو في الخلفية بأمان — يمكنك الضغط على "حفظ التغييرات" وسيكتمل الرفع والربط تلقائياً.
              </span>
            </div>
          </div>
        )}

        {/* 2. Video Already Uploaded / Ready */}
        {!isUploadingVideo && previewVideoUrl && (
          <div className="space-y-3">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-xs relative">
              <iframe
                src={previewVideoUrl}
                className="w-full h-full border-0"
                allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                allowFullScreen
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium">الفيديو التعريفي مفعّل وجاهز للعرض</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                  <span>تغيير الفيديو</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleDirectVideoUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemovePreviewVideo}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="حذف الفيديو"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Empty State: Direct Video Upload Dropzone */}
        {!isUploadingVideo && !previewVideoUrl && (
          <div className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white group">
            <input
              type="file"
              accept="video/*"
              onChange={handleDirectVideoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-600">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-primary-100 shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-900">
                انقر لاختيار فيديو أو سحبه هنا للرفع المباشر إلى سيرفرات البث السحابي
              </p>
              <div className="flex items-center flex-wrap justify-center gap-2 text-[11px] text-slate-500 mt-1">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                  الحد الأقصى: 2 جيجابايت
                </span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">
                  تشفير وحماية سحابية تلقائية
                </span>
                <span>•</span>
                <span>دقة فائقة HLS متكيفة</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
