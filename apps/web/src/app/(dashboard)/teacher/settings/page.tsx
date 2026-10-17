import { TeacherSettingsView } from '@/features/teachers/components/TeacherSettingsView';

export const metadata = {
  title: 'بيانات المدرس وإعدادات الحساب | منصة الأوّل',
  description: 'تحديث بيانات الحساب وتغيير كلمة المرور',
};

export default function TeacherSettingsPage() {
  return <TeacherSettingsView />;
}
