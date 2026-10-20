'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { VideoUploadManagerProvider } from '@/features/courses/context/video-upload-manager.context';

const BackgroundVideoUploadMonitor = dynamic(
  () =>
    import('@/features/courses/components/BackgroundVideoUploadMonitor').then(
      (mod) => mod.BackgroundVideoUploadMonitor,
    ),
  { ssr: false },
);

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <VideoUploadManagerProvider>
      {children}
      <BackgroundVideoUploadMonitor />
    </VideoUploadManagerProvider>
  );
}
