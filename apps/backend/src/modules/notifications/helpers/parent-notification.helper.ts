import { NotificationChannel, NotificationType } from '@prisma/client';
import { SendNotificationDto } from '../services/notification-dispatch.service';

export interface ParentUserSummary {
  id: string;
  phone?: string | null;
  fullName?: string | null;
}

export interface ParentLinkItem {
  parent: {
    user: ParentUserSummary;
  };
}

/**
 * Traverses student parentLinks with visited deduplication and generates notification items.
 */
export function collectParentNotifications(
  parentLinks: ParentLinkItem[],
  createPayload: (parentUser: ParentUserSummary) => {
    notificationType: NotificationType;
    type: string;
    title: string;
    body: string;
    extraChannels?: NotificationChannel[];
    data?: Record<string, unknown>;
    referenceEntityId?: string;
  },
): SendNotificationDto[] {
  const visitedParents = new Set<string>();
  const items: SendNotificationDto[] = [];

  for (const link of parentLinks) {
    const parentUser = link.parent?.user;
    if (!parentUser || !parentUser.id) continue;
    if (visitedParents.has(parentUser.id)) continue;
    visitedParents.add(parentUser.id);

    const parentPhone = parentUser.phone;
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (parentPhone) {
      channels.push(NotificationChannel.WHATSAPP);
    }

    const payload = createPayload(parentUser);
    if (payload.extraChannels) {
      for (const ch of payload.extraChannels) {
        if (!channels.includes(ch)) channels.push(ch);
      }
    }

    items.push({
      recipientId: parentUser.id,
      notificationType: payload.notificationType,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      channels,
      data: payload.data,
      referenceEntityId: payload.referenceEntityId,
    });
  }

  return items;
}
