import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  QrCode,
  GraduationCap,
  FileText,
  BookOpen,
  Video,
  DollarSign,
  ClipboardList,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ElementType;
  onlineOnly: boolean;
  isHighlighted?: boolean;
}

export const TEACHER_NAVIGATION_ITEMS: NavItemConfig[] = [
  { label: 'لوحة التحكم', href: '/teacher/dashboard', icon: LayoutDashboard, onlineOnly: false },
  { label: 'المجموعات الدراسية', href: '/teacher/groups', icon: Users, onlineOnly: false },
  { label: 'طلبات الانضمام', href: '/teacher/reservations', icon: ClipboardList, onlineOnly: false },
  { label: 'جدول وحصص المعلم', href: '/teacher/schedules', icon: Calendar, onlineOnly: false },
  { label: 'رصد الحضور والـ QR', href: '/teacher/attendance', icon: QrCode, onlineOnly: false },
  { label: 'سجل الطلاب', href: '/teacher/students', icon: GraduationCap, onlineOnly: false },
  { label: 'الواجبات والاختبارات', href: '/teacher/assessments', icon: FileText, onlineOnly: true },
  { label: 'الكورسات أونلاين', href: '/teacher/courses', icon: Video, onlineOnly: true },
  { label: 'المحتوى والدروس', href: '/teacher/content', icon: BookOpen, onlineOnly: true },
  { label: 'الماليات والمصروفات', href: '/teacher/finance', icon: DollarSign, onlineOnly: false },
];

export const STUDENT_NAVIGATION_ITEMS: NavItemConfig[] = [
  { label: 'الرئيسية', href: '/student/dashboard', icon: LayoutDashboard, onlineOnly: false },
  { label: 'المجموعة الدراسية', href: '/student/group', icon: Users, onlineOnly: false },
  { label: 'الدورات الأونلاين', href: '/student/courses', icon: BookOpen, onlineOnly: true },
  { label: 'الواجبات المنزلية', href: '/student/homework', icon: ClipboardList, onlineOnly: true },
  { label: 'الاختبارات', href: '/student/assessments', icon: FileText, onlineOnly: true },
  { label: 'الحضور', href: '/student/attendance', icon: QrCode, onlineOnly: false, isHighlighted: true },
  { label: 'المدفوعات', href: '/student/payments', icon: DollarSign, onlineOnly: false },
];

export const PARENT_NAVIGATION_ITEMS: NavItemConfig[] = [
  { label: 'أبنائي', href: '/parent/dashboard', icon: LayoutDashboard, onlineOnly: false },
];

/**
 * Returns navigation items for a given role filtered by the active network status.
 * In offline mode, all `onlineOnly: true` items are omitted.
 */
export function getNavigationItemsForRole(role?: string, isOnline: boolean = true): NavItemConfig[] {
  const baseItems =
    role === 'STUDENT'
      ? STUDENT_NAVIGATION_ITEMS
      : role === 'PARENT'
      ? PARENT_NAVIGATION_ITEMS
      : TEACHER_NAVIGATION_ITEMS;

  if (!isOnline) {
    return baseItems.filter((item) => !item.onlineOnly);
  }

  return baseItems;
}
