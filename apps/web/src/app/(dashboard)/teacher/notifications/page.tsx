'use client';

import React from 'react';
import { WhatsAppConnectionManager } from '@/components/admin/WhatsAppConnectionManager';
import { WhatsAppQueueManager } from '@/features/notifications/components/WhatsAppQueueManager';
import { NotificationHeaderTabs } from '@/features/notifications/components/NotificationHeaderTabs';
import { NotificationControlsTab } from '@/features/notifications/components/NotificationControlsTab';
import { NotificationFeedTab } from '@/features/notifications/components/NotificationFeedTab';
import { useTeacherNotificationsPage } from '@/features/notifications/hooks/useTeacherNotificationsPage';

export default function NotificationCenterPage() {
  const p = useTeacherNotificationsPage();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      <NotificationHeaderTabs
        activeTab={p.activeTab}
        setActiveTab={p.setActiveTab}
        isWABanned={p.isWABanned}
        isWAWaitingQR={p.isWAWaitingQR}
        failedWaCount={p.failedWaCount}
        unreadCount={p.unreadCount}
      />

      {p.activeTab === 'whatsapp' ? (
        <WhatsAppQueueManager />
      ) : p.activeTab === 'controls' ? (
        <NotificationControlsTab
          settings={p.settings}
          isSettingsLoading={p.isSettingsLoading}
          isWABanned={p.isWABanned}
          isWAConnected={p.isWAConnected}
          isWAWaitingQR={p.isWAWaitingQR}
          whatsAppStatus={p.whatsAppStatus}
          userPhone={p.user?.phone}
          updateSettings={p.updateSettings}
          handleToggle={p.handleToggle}
          onOpenWhatsAppModal={() => p.setIsWhatsAppModalOpen(true)}
          isDispatchingSchedule={p.isDispatchingSchedule}
          onTestDailySchedule={p.handleTestDailySchedule}
        />
      ) : (
        <NotificationFeedTab {...p} />
      )}

      <WhatsAppConnectionManager
        isOpen={p.isWhatsAppModalOpen}
        onClose={() => p.setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
}
