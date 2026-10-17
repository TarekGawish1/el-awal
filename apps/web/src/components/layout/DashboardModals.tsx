'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { BootstrapProgressIndicator } from '@/components/pwa/BootstrapProgressIndicator';

const SyncReviewModal = dynamic(
  () => import('@/components/sync').then((m) => m.SyncReviewModal),
  { ssr: false }
);
const SyncConfirmationModal = dynamic(
  () => import('@/components/sync').then((m) => m.SyncConfirmationModal),
  { ssr: false }
);
const OfflineActivityDrawer = dynamic(
  () => import('@/components/sync').then((m) => m.OfflineActivityDrawer),
  { ssr: false }
);
const WhatsAppConnectionManager = dynamic(
  () => import('@/components/admin/WhatsAppConnectionManager').then((m) => m.WhatsAppConnectionManager),
  { ssr: false }
);

interface DashboardModalsProps {
  isSyncReviewOpen: boolean;
  setIsSyncReviewOpen: (open: boolean) => void;
  isSyncConfirmationOpen: boolean;
  setIsSyncConfirmationOpen: (open: boolean) => void;
  isActivityDrawerOpen: boolean;
  setIsActivityDrawerOpen: (open: boolean) => void;
  isWhatsAppManagerOpen: boolean;
  setIsWhatsAppManagerOpen: (open: boolean) => void;
  LogoutConfirmation: React.ReactNode;
}

export function DashboardModals({
  isSyncReviewOpen,
  setIsSyncReviewOpen,
  isSyncConfirmationOpen,
  setIsSyncConfirmationOpen,
  isActivityDrawerOpen,
  setIsActivityDrawerOpen,
  isWhatsAppManagerOpen,
  setIsWhatsAppManagerOpen,
  LogoutConfirmation,
}: DashboardModalsProps) {
  return (
    <>
      {/* Floating Offline Bootstrap Hydration Indicator */}
      <BootstrapProgressIndicator />

      {/* Bi-Directional Sync Review Modal */}
      <SyncReviewModal
        isOpen={isSyncReviewOpen}
        onClose={() => setIsSyncReviewOpen(false)}
        onSuccess={() => setIsSyncReviewOpen(false)}
      />

      {/* Reconnection Confirmation Modal */}
      <SyncConfirmationModal
        isOpen={isSyncConfirmationOpen}
        onClose={() => setIsSyncConfirmationOpen(false)}
      />

      {/* Offline Pending Activity Drawer */}
      <OfflineActivityDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
      />

      {/* WhatsApp Gateway Quick Manager Modal */}
      <WhatsAppConnectionManager
        isOpen={isWhatsAppManagerOpen}
        onClose={() => setIsWhatsAppManagerOpen(false)}
      />

      {LogoutConfirmation}
    </>
  );
}
