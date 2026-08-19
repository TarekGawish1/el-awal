import { Metadata } from 'next';
import { TeacherSessionsCalendar } from '@/features/schedules/components/TeacherSessionsCalendar';

export const metadata: Metadata = {
  title: 'جدول وحصص المعلم | منصة الأول',
  description: 'إدارة الخط الزمني للحصص وتسمية موضوعات الدروس وربط المذكرات والواجبات بالحصة',
};

export default function TeacherSchedulesPage() {
  return <TeacherSessionsCalendar />;
}
