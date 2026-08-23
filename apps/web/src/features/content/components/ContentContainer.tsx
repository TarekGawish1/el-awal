'use client';

import { useState } from 'react';
import { ContentLibrary } from './ContentLibrary';
import { UploadModal } from './UploadModal';


export function ContentContainer() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <ContentLibrary onUploadClick={() => setIsUploadOpen(true)} />
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
