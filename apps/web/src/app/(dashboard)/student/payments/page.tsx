import { StudentPaymentsView } from '@/features/student-portal/components/StudentPaymentsView';

export const metadata = {
  title: 'سجل المدفوعات والاشتراكات | بوابة الطالب',
  description: 'متابعة المصروفات الدراسية وحالة الدفع وإيصالات السداد',
};

export default function StudentPaymentsPage() {
  return <StudentPaymentsView />;
}
