import { Metadata } from 'next';
import { GroupDetails } from '@/features/groups';

export const metadata: Metadata = {
  title: 'تفاصيل المجموعة | الأول',
  description: 'إدارة تفاصيل المجموعة وقائمة الطلاب',
};

interface GroupDetailsPageProps {
  params: {
    id: string;
  };
}

export default function GroupDetailsPage({ params }: GroupDetailsPageProps) {
  return <GroupDetails id={params.id} />;
}
