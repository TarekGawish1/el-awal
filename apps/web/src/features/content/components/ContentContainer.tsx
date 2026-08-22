'use client';

import { useState } from 'react';
import { ContentLibrary } from './ContentLibrary';
import { UploadModal } from './UploadModal';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';

export function ContentContainer() {
  const isOnline = useOnlineStatus();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="المحتوى والدروس"
        description="إدارة بنوك الأسئلة ورفع الفيديوهات والمحتوى التعليمي تتطلب اتصالاً نشطاً بالخادم."
        backHref="/teacher/dashboard"
      />
    );
  }

  return (
    <>
      <ContentLibrary onUploadClick={() => setIsUploadOpen(true)} />
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
