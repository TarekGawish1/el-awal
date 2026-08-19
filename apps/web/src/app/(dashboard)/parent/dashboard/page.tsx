import type { Metadata } from 'next';
import { ParentDashboard } from '@/features/parent-portal';

export const metadata: Metadata = {
  title: 'لوحة ولي الأمر | منصة الأول التعليمية',
  description: 'متابعة بيانات الأبناء ومستواهم الدراسي',
};

export default function ParentDashboardPage() {
  return <ParentDashboard />;
}
