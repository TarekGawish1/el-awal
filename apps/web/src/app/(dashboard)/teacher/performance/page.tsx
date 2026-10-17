import { Metadata } from 'next';
import { TeacherPerformanceView } from '@/features/teachers/components/TeacherPerformanceView';

export const metadata: Metadata = {
  title: 'سرعة وأداء المنصة | منصة الأول',
  description: 'التحكم في سرعة استجابة المنصة ومضاعفة الأداء أثناء الامتحانات والمراجعات الكبرى',
};

export default function PerformancePage() {
  return <TeacherPerformanceView />;
}
