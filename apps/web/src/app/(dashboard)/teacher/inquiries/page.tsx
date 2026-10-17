import { TeacherInquiriesView } from '@/features/inquiries/components/TeacherInquiriesView';

export const metadata = {
  title: 'رسائل الموقع والاستفسارات | لوحة المدرس',
  description: 'إدارة ومتابعة رسائل نموذج اتصل بنا الواردة من الصفحة الرئيسية',
};

export default function InquiriesPage() {
  return <TeacherInquiriesView />;
}
