import { Metadata } from 'next';
import { StudentDashboard } from '@/features/student-portal/components/StudentDashboard';

export const metadata: Metadata = {
  title: 'لوحة تحكم الطالب | منصة الأول',
  description: 'ملخص المستوى الدراسي والمهام المطلوبة',
};

export default function StudentDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <StudentDashboard />
    </div>
  );
}
