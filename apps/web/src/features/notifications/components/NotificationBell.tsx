'use client';

import { NotificationCenter } from '@/components/notifications/NotificationCenter';

/** Feature-level name for the notification center used by the dashboard shell. */
export function NotificationBell({ unreadCount }: { unreadCount?: number } = {}) {
  return <NotificationCenter unreadCount={unreadCount} />;
}

export default NotificationBell;
