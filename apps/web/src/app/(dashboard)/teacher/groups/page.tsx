import { Metadata } from 'next';
import { GroupList } from '@/features/groups';

export const metadata: Metadata = {
  title: 'إدارة المجموعات | الأول',
  description: 'إدارة مجموعاتك الدراسية والطلاب المسجلين بها',
};

export default function GroupsPage() {
  return <GroupList />;
}
