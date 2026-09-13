'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ShieldAlert, RefreshCw, Loader2 } from 'lucide-react';

export interface LessonStreamTicketResponse {
  embedUrl: string;
  expiresAt: number;
}

export interface LessonVideoPlayerUser {
  fullName?: string;
  studentCode?: string;
  phone?: string;
}

export interface LessonVideoPlayerProps {
  lessonId: string;
  user?: LessonVideoPlayerUser;
  onEnded?: () => void;
  className?: string;
}

export function LessonVideoPlayer({
  lessonId,
  user: propUser,
  className = '',
}: LessonVideoPlayerProps) {
  const storeUser = useAuthStore((state) => state.user);
  const user = propUser || {
    fullName: storeUser?.fullName || 'طالب مسجل',
    studentCode: (storeUser as any)?.studentCode || '',
    phone: storeUser?.phone || '',
  };

  // 1. Fetch the ticket on mount using TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useQuery<LessonStreamTicketResponse>({
    queryKey: ['lesson-stream-ticket', lessonId],
    queryFn: () => apiClient.get<LessonStreamTicketResponse>(`/courses/lessons/${lessonId}/stream-ticket`),
    staleTime: 60 * 60 * 1000, // 1 hour stale time within 2-hour window
    enabled: !!lessonId,
  });

  // Floating watermark randomized coordinate state
  const [watermarkPos, setWatermarkPos] = useState({ top: 15, left: 15 });

  const randomizeWatermarkPosition = useCallback(() => {
    // Keep watermark within 8% to 78% top, 8% to 70% left
    const newTop = Math.floor(Math.random() * 70) + 8;
    const newLeft = Math.floor(Math.random() * 62) + 8;
    setWatermarkPos({ top: newTop, left: newLeft });
  }, []);

  // 3. Timer useEffect that shifts watermarkPos coordinates randomly every 20–30 seconds
  useEffect(() => {
    randomizeWatermarkPosition();

    // Schedule next shift within 20 to 30 seconds
    let timeoutId: NodeJS.Timeout;
    const scheduleNextShift = () => {
      const intervalMs = Math.floor(Math.random() * 10000) + 20000; // 20–30 seconds
      timeoutId = setTimeout(() => {
        randomizeWatermarkPosition();
        scheduleNextShift();
      }, intervalMs);
    };

    scheduleNextShift();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [randomizeWatermarkPosition]);

  return (
    <div
      data-testid="lesson-video-player-container"
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 select-none shadow-lg border border-slate-800 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 2. Responsive Bunny iframe inside protected container */}
      {data?.embedUrl && (
        <iframe
          data-testid="bunny-stream-iframe"
          src={data.embedUrl}
          loading="lazy"
          className="w-full h-full border-0 block"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          data-testid="player-loading-skeleton"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white z-10"
        >
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <span className="text-xs font-mono text-slate-300">
            جاري تأمين البث وتوليد التذكرة المشفرة...
          </span>
        </div>
      )}

      {/* Error state */}
      {!isLoading && (error || (!data?.embedUrl && !isFetching)) && (
        <div
          data-testid="player-error-fallback"
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-200 z-10"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">تعذر تشغيل الفيديو المحمي</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {error ? (error as any).message || 'يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس' : 'الفيديو غير متاح حالياً لهذا الدرس'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Floating Dynamic Watermark against Screen Recording */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        <div
          data-testid="dynamic-video-watermark"
          className="text-xs font-mono font-bold text-white/20 tracking-wider p-3 select-none transition-all duration-1000"
          style={{
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            position: 'absolute',
          }}
        >
          {user.fullName} • {user.studentCode || user.phone}
        </div>
      </div>
    </div>
  );
}

export default LessonVideoPlayer;
