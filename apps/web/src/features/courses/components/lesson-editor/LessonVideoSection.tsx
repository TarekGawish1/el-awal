"use client";

import React from "react";
import {
  Video,
  Sparkles,
  CheckCircle,
  Loader2,
  UploadCloud,
  Trash2,
  Gauge,
  Clock,
  Info,
} from "lucide-react";
import {
  formatVideoSize,
  formatEtaArabic,
  VideoMetadata,
} from "../../utils/video-optimizer";

export interface LessonVideoSectionProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  bunnyVideoId: string;
  videoEmbedUrl: string;
  uploadedVideoName: string;
  isUploadingVideo: boolean;
  isInspectingVideo: boolean;
  videoUploadProgress: number;
  uploadSpeedMbps: number;
  uploadedBytes: number;
  totalBytes: number;
  etaSeconds: number;
  videoMeta: VideoMetadata | null;
  streamAuth: any;
  backgroundUploadTask: any;
  videoDurationSeconds: number;
  setVideoDurationSeconds: (val: number) => void;
  isFreePreview: boolean;
  setIsFreePreview: (val: boolean) => void;
  handleDirectVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCancelUpload: () => void;
  handleRemoveVideo: () => Promise<void>;
}

export function LessonVideoSection({
  title,
  setTitle,
  description,
  setDescription,
  bunnyVideoId,
  videoEmbedUrl,
  uploadedVideoName,
  isUploadingVideo,
  isInspectingVideo,
  videoUploadProgress,
  uploadSpeedMbps,
  uploadedBytes,
  totalBytes,
  etaSeconds,
  videoMeta,
  streamAuth,
  backgroundUploadTask,
  videoDurationSeconds,
  setVideoDurationSeconds,
  isFreePreview,
  setIsFreePreview,
  handleDirectVideoUpload,
  handleCancelUpload,
  handleRemoveVideo,
}: LessonVideoSectionProps) {
  const isBunny = Boolean(
    bunnyVideoId ||
      videoEmbedUrl?.includes("mediadelivery.net") ||
      videoEmbedUrl?.startsWith("bunny:") ||
      streamAuth?.videoId
  );

  // Active Video URL Priority:
  // 1. If background upload task just completed in this modal -> use its fresh embedUrl
  // 2. If this is a Bunny video and streamAuth provides a fresh signed embedUrl -> ALWAYS prefer streamAuth (avoids stale/expired tokens)
  // 3. Fallback to videoEmbedUrl or streamAuth?.embedUrl
  const activeVideoUrl =
    backgroundUploadTask?.embedUrl ||
    (isBunny && streamAuth?.embedUrl ? streamAuth.embedUrl : null) ||
    streamAuth?.embedUrl ||
    videoEmbedUrl;

  const hasVideo = Boolean(
    bunnyVideoId || videoEmbedUrl || streamAuth?.videoId || backgroundUploadTask?.videoId
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1.5">
          عنوان الدرس <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: الدرس الأول: شرح كان وأخواتها بالتفصيل"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1.5">
          أهداف ونبذة عن الدرس
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="النقاط الرئيسية التي سيتم شرحها خلال هذا الدرس..."
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
        />
      </div>

      {/* Direct Drag & Drop Video Upload Area */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Video className="w-4 h-4 text-primary-600" />
            فيديو الشرح التفاعلي المشفر (حتى 2 جيجابايت)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>ضغط سحابي ذكي متعدد الجودات</span>
            </span>
            {hasVideo && (
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>تم ربط وتجهيز الفيديو بنجاح</span>
              </span>
            )}
          </div>
        </div>

        {/* Processing notice if video is currently encoding on Bunny CDN */}
        {streamAuth?.videoStatus === "PROCESSING" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
            <span>
              جاري تشفير وتقطيع الفيديو سحابياً بجودات متعددة... قد يستغرق دقيقة ليكتمل تجهيز المشغل بالكامل.
            </span>
          </div>
        )}

        {/* Uploaded Video Preview Player Card */}
        {hasVideo ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
            <div
              className="relative w-full aspect-video bg-black rounded-t-2xl overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: "16 / 9", width: "100%" }}
            >
              {activeVideoUrl ? (
                <iframe
                  src={activeVideoUrl}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full border-0 absolute inset-0 block"
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-400" />
                  <p className="text-xs">جاري تجهيز مشغل الفيديو السحابي...</p>
                </div>
              )}
            </div>
            <div className="p-3.5 bg-slate-800/90 flex items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">
                    {uploadedVideoName || backgroundUploadTask?.fileName || "فيديو الشرح المباشر"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                    <span>ID: {bunnyVideoId || streamAuth?.videoId || backgroundUploadTask?.videoId}</span>
                    {videoMeta && (
                      <span className="text-emerald-400">
                        • {videoMeta.qualityLabel} ({videoMeta.formattedSize})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>تغيير الفيديو</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleDirectVideoUpload}
                    disabled={isUploadingVideo}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                  title="حذف الفيديو"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Direct Upload Dropzone */
          <div className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white group">
            <input
              type="file"
              accept="video/*"
              onChange={handleDirectVideoUpload}
              disabled={isUploadingVideo}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-600">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100 shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-900">
                انقر لاختيار فيديو أو سحبه هنا للرفع المباشر إلى السيرفر السحابي
              </p>
              <div className="flex items-center flex-wrap justify-center gap-2 text-[11px] text-slate-500 mt-1">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                  الحد الأقصى: 2 جيجابايت (2048 MB)
                </span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">
                  ضغط سحابي تلقائي (HLS 1080p, 720p, 480p, 360p)
                </span>
                <span>•</span>
                <span>تشفير DRM ضد التسجيل والسرقة</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress & Speed Metrics */}
        {isUploadingVideo && (
          <div className="p-4 bg-white border border-blue-100 rounded-xl shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                {isInspectingVideo
                  ? "جاري فحص وتجهيز الفيديو والضغط السحابي..."
                  : "جاري الرفع المباشر إلى سيرفرات البث السحابي..."}
              </span>
              <span className="font-mono text-primary-600 text-sm">
                {videoUploadProgress}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${videoUploadProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
              <div className="flex items-center gap-3">
                {totalBytes > 0 && (
                  <span>
                    تم رفع: <strong className="text-slate-800 font-mono">{formatVideoSize(uploadedBytes)}</strong> من <strong className="text-slate-800 font-mono">{formatVideoSize(totalBytes)}</strong>
                  </span>
                )}
                {uploadSpeedMbps > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Gauge className="w-3.5 h-3.5" />
                    <span className="font-mono">{uploadSpeedMbps} ميجابايت/ث</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {etaSeconds > 0 && (
                  <span className="text-slate-600">
                    الوقت المتبقي: <strong className="text-slate-800">{formatEtaArabic(etaSeconds)}</strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-bold"
                >
                  إلغاء الرفع
                </button>
              </div>
            </div>

            <div className="bg-blue-50/80 border border-blue-100/90 rounded-xl p-2.5 text-center text-xs text-blue-800 flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">
                يستمر رفع الفيديو في الخلفية بأمان — يمكنك إغلاق نافذة الدرس أو متابعة العمل وإضافة الاختبارات دون انقطاع.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Duration & Free Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            مدة الفيديو (بالثواني)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={videoDurationSeconds}
              onChange={(e) =>
                setVideoDurationSeconds(parseInt(e.target.value) || 0)
              }
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm font-mono"
            />
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {Math.floor(videoDurationSeconds / 60)} دقيقة و{" "}
            {videoDurationSeconds % 60} ثانية
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl my-auto">
          <div>
            <p className="text-xs font-bold text-slate-900">
              معاينة مجانية للجميع
            </p>
            <p className="text-[10px] text-slate-500">
              إتاحة مشاهدة هذا الدرس لجميع الزوار بدون اشتراك
            </p>
          </div>
          <input
            type="checkbox"
            checked={isFreePreview}
            onChange={(e) => setIsFreePreview(e.target.checked)}
            className="w-4 h-4 rounded text-primary-600 bg-white border-slate-300 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
