'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { GroupList, GroupDetails } from '@/features/groups';

export default function GroupsPage() {
  const pathname = usePathname();
  const pathParts = pathname?.split('/').filter(Boolean) || [];
  const directGroupId = pathParts.length >= 3 && pathParts[1] === 'groups' ? pathParts[2] : null;

  if (directGroupId) {
    return <GroupDetails id={directGroupId} />;
  }

  return <GroupList />;
}
