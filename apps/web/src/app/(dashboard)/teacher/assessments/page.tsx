import { Metadata } from 'next';
import { AssessmentList } from '@/features/assessments/components/AssessmentList';

export const metadata: Metadata = {
  title: 'الاختبارات | منصة الأول',
  description: 'إدارة الاختبارات والواجبات للطلاب',
};

export default function AssessmentsPage() {
  return <AssessmentList />;
}
