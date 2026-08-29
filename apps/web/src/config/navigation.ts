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
  Bell,
  MessageSquareShare,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ElementType;
  onlineOnly: boolean;
  isHighlighted?: boolean;
  isAction?: boolean;
  actionId?: 'whatsapp-manager' | string;
  badgeKey?: 'reservations' | string;
}

export interface NavSectionConfig {
  id: string;
  title?: string;
  items: NavItemConfig[];
}

export const TEACHER_NAVIGATION_SECTIONS: NavSectionConfig[] = [
  {
    id: 'top',
    items: [
      { label: 'لوحة التحكم', href: '/teacher/dashboard', icon: LayoutDashboard, onlineOnly: false },
    ],
  },
  {
    id: 'education-lessons',
    title: 'التعليم والدروس',
    items: [
      { label: 'المجموعات الدراسية', href: '/teacher/groups', icon: Users, onlineOnly: false },
      { label: 'جدول وحصص المعلم', href: '/teacher/schedules', icon: Calendar, onlineOnly: false },
      { label: 'الواجبات والاختبارات', href: '/teacher/assessments', icon: FileText, onlineOnly: true },
      { label: 'المحتوى والدروس', href: '/teacher/content', icon: BookOpen, onlineOnly: true },
      { label: 'الكورسات أونلاين', href: '/teacher/courses', icon: Video, onlineOnly: true },
    ],
  },
  {
    id: 'student-affairs',
    title: 'شؤون الطلاب',
    items: [
      { label: 'سجل الطلاب', href: '/teacher/students', icon: GraduationCap, onlineOnly: false },
      { label: 'طلبات الانضمام', href: '/teacher/reservations', icon: ClipboardList, onlineOnly: false, badgeKey: 'reservations' },
    ],
  },
  {
    id: 'records-finances',
    title: 'السجلات والمالية',
    items: [
      { label: 'رصد الحضور والـ QR', href: '/teacher/attendance', icon: QrCode, onlineOnly: false },
      { label: 'الماليات والمصروفات', href: '/teacher/finance', icon: DollarSign, onlineOnly: false },
    ],
  },
  {
    id: 'communication-center',
    title: 'مركز التواصل',
    items: [
      { label: 'مركز الإشعارات والتحكم', href: '/teacher/notifications', icon: Bell, onlineOnly: false },
      { label: 'رسائل الموقع', href: '/teacher/inquiries', icon: MessageSquareShare, onlineOnly: true },
      {
        label: 'ربط وإدارة الواتساب',
        href: '#whatsapp-manager',
        icon: MessageSquareShare,
        onlineOnly: false,
        isAction: true,
        actionId: 'whatsapp-manager',
      },
    ],
  },
];

export const STUDENT_NAVIGATION_SECTIONS: NavSectionConfig[] = [
  {
    id: 'top',
    items: [
      { label: 'الرئيسية', href: '/student/dashboard', icon: LayoutDashboard, onlineOnly: false },
    ],
  },
  {
    id: 'education-lessons',
    title: 'التعليم والدروس',
    items: [
      { label: 'المجموعة الدراسية', href: '/student/group', icon: Users, onlineOnly: false },
      { label: 'الدورات الأونلاين', href: '/student/courses', icon: BookOpen, onlineOnly: true },
      { label: 'الواجبات المنزلية', href: '/student/homework', icon: ClipboardList, onlineOnly: true },
      { label: 'الاختبارات', href: '/student/assessments', icon: FileText, onlineOnly: true },
    ],
  },
  {
    id: 'records-payments',
    title: 'السجلات والمدفوعات',
    items: [
      { label: 'الحضور', href: '/student/attendance', icon: QrCode, onlineOnly: false, isHighlighted: true },
      { label: 'المدفوعات', href: '/student/payments', icon: DollarSign, onlineOnly: false },
    ],
  },
];

export const PARENT_NAVIGATION_SECTIONS: NavSectionConfig[] = [
  {
    id: 'top',
    items: [
      { label: 'أبنائي', href: '/parent/dashboard', icon: LayoutDashboard, onlineOnly: false },
    ],
  },
];

// Flattened list exports for backward compatibility
export const TEACHER_NAVIGATION_ITEMS: NavItemConfig[] = TEACHER_NAVIGATION_SECTIONS.flatMap((s) => s.items).filter((i) => !i.isAction);
export const STUDENT_NAVIGATION_ITEMS: NavItemConfig[] = STUDENT_NAVIGATION_SECTIONS.flatMap((s) => s.items);
export const PARENT_NAVIGATION_ITEMS: NavItemConfig[] = PARENT_NAVIGATION_SECTIONS.flatMap((s) => s.items);

/**
 * Returns grouped navigation sections for a given role filtered by the active network status.
 * In offline mode, all `onlineOnly: true` items are omitted. Empty sections are pruned.
 */
export function getNavigationSectionsForRole(role?: string, isOnline: boolean = true): NavSectionConfig[] {
  const baseSections =
    role === 'STUDENT'
      ? STUDENT_NAVIGATION_SECTIONS
      : role === 'PARENT'
      ? PARENT_NAVIGATION_SECTIONS
      : TEACHER_NAVIGATION_SECTIONS;

  return baseSections
    .map((section) => ({
      ...section,
      items: isOnline ? section.items : section.items.filter((item) => !item.onlineOnly),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Returns flat navigation items for a given role filtered by the active network status.
 * In offline mode, all `onlineOnly: true` items are omitted.
 */
export function getNavigationItemsForRole(role?: string, isOnline: boolean = true): NavItemConfig[] {
  const sections = getNavigationSectionsForRole(role, isOnline);
  return sections.flatMap((section) => section.items).filter((item) => !item.isAction);
}
