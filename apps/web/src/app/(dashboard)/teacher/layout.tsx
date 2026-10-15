'use client';

import React from 'react';
import { VideoUploadManagerProvider } from '@/features/courses/context/video-upload-manager.context';
import { BackgroundVideoUploadMonitor } from '@/features/courses/components/BackgroundVideoUploadMonitor';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <VideoUploadManagerProvider>
      {children}
      <BackgroundVideoUploadMonitor />
    </VideoUploadManagerProvider>
  );
}
