'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { GroupSessionDeliveryView } from '@/features/groups/components/GroupSessionDeliveryView';

export default function GroupSessionDeliveryPage() {
  const params = useParams();
  const groupId = (params?.id as string) || '';
  const sessionId = (params?.sessionId as string) || '';

  return <GroupSessionDeliveryView groupId={groupId} sessionId={sessionId} />;
}
