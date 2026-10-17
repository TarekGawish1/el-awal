import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CreditCard,
  ClipboardList,
  MessageSquare,
  Bell as BellIcon,
} from 'lucide-react';

export const notificationTypeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  ABSENCE_ALERT_PARENT: {
    icon: <AlertTriangle size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  EXAM_FAILED_ALERT_PARENT: {
    icon: <AlertTriangle size={16} />,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  ASSESSMENT_GRADED: {
    icon: <ClipboardList size={16} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  SESSION_REMINDER_STUDENT: {
    icon: <Calendar size={16} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_SESSION_REMINDER: {
    icon: <Calendar size={16} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_DAILY_SCHEDULE: {
    icon: <BookOpen size={16} />,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  ONLINE_EXAM_REMINDER: {
    icon: <ClipboardList size={16} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  NEW_HOMEWORK_ASSIGNED: {
    icon: <ClipboardList size={16} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  HOMEWORK_DEADLINE_REMINDER: {
    icon: <AlertTriangle size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  NEW_EXAM_PUBLISHED: {
    icon: <ClipboardList size={16} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  EXAM_DEADLINE_REMINDER: {
    icon: <AlertTriangle size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  PAYMENT_RECEIVED: {
    icon: <CreditCard size={16} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  TEACHER_JOIN_REQUEST: {
    icon: <ClipboardList size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  GENERAL_ANNOUNCEMENT: {
    icon: <BellIcon size={16} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  STUDENT_ABSENCE: {
    icon: <AlertTriangle size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  default: {
    icon: <MessageSquare size={16} />,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
};

export function getTypeConfig(type: string) {
  return notificationTypeConfig[type] || notificationTypeConfig.default;
}
