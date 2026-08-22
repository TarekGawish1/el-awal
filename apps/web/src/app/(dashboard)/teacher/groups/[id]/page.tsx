'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { GroupDetails } from '@/features/groups';

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function GroupDetailsPage({ params }: PageProps) {
  const routeParams = useParams();
  const id = (params?.id || routeParams?.id) as string;

  return <GroupDetails id={id} />;
}
