import { StudentAttendanceView } from '@/features/student-portal/components/StudentAttendanceView';

export const metadata = {
  title: 'سجل الحضور والـ QR | بوابة الطالب',
  description: 'عرض بطاقة الحضور الرقمية وسجل الحضور والغياب للمجموعات الدراسية',
};

export default function StudentAttendancePage() {
  return <StudentAttendanceView />;
}
