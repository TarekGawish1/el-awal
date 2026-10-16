'use client';

import React from 'react';
import { Video, X } from 'lucide-react';

export interface PreviewPromoVideoModalProps {
  modalData: {
    title: string;
    videoUrl: string;
    teacherName?: string;
  } | null;
  onClose: () => void;
}

export function PreviewPromoVideoModal({
  modalData,
  onClose,
}: PreviewPromoVideoModalProps) {
  if (!modalData || !modalData.videoUrl || modalData.videoUrl.startsWith('bunny:')) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-slate-200 text-right animate-in zoom-in-95 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{modalData.title}</h3>
              <p className="text-xs text-slate-400">
                الفيديو التعريفي (البرومو الترويجي) • {modalData.teacherName || 'معلم المادة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 bg-slate-950">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800">
            <iframe
              src={`${modalData.videoUrl}${modalData.videoUrl.includes('?') ? '&' : '?'}autoplay=1`}
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            معاينة مجانية للمحتوى التمهيدي
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
