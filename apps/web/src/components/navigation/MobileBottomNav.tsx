'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  QrCode,
  Calendar,
  Menu,
  BookOpen,
  FileText,
  DollarSign,
  GraduationCap,
} from 'lucide-react';

import { useOnlineStatus } from '@/lib/offline/use-online-status';

interface NavTabItem {
  label: string;
  href: string;
  icon: React.ElementType;
  isHighlighted?: boolean;
  onlineOnly?: boolean;
}

interface MobileBottomNavProps {
  userRole?: string;
  onOpenMobileMenu: () => void;
}

export function MobileBottomNav({ userRole, onOpenMobileMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();

  // Role-specific bottom navigation tabs (Top 4 most-used daily tasks + Menu trigger)
  const teacherTabs: NavTabItem[] = [
    { label: 'الرئيسية', href: '/teacher/dashboard', icon: LayoutDashboard, onlineOnly: false },
    { label: 'المجموعات', href: '/teacher/groups', icon: Users, onlineOnly: false },
    { label: 'رصد الحضور', href: '/teacher/attendance', icon: QrCode, isHighlighted: true, onlineOnly: false },
    { label: 'الجدول', href: '/teacher/schedules', icon: Calendar, onlineOnly: false },
  ];

  const studentTabs: NavTabItem[] = [
    { label: 'الرئيسية', href: '/student/dashboard', icon: LayoutDashboard, onlineOnly: false },
    { label: 'المجموعة الدراسية', href: '/student/group', icon: Users, onlineOnly: false },
    { label: 'الدورات الأونلاين', href: '/student/courses', icon: BookOpen, onlineOnly: true },
    { label: 'الـ QR', href: '/student/attendance', icon: QrCode, isHighlighted: true, onlineOnly: false },
    { label: 'التقييمات', href: '/student/assessments', icon: FileText, onlineOnly: true },
    { label: 'المدفوعات', href: '/student/payments', icon: DollarSign, onlineOnly: false },
  ];

  const parentTabs: NavTabItem[] = [
    { label: 'أبنائي', href: '/parent/dashboard', icon: LayoutDashboard, onlineOnly: false },
  ];

  const baseTabs: NavTabItem[] = userRole === 'STUDENT'
    ? studentTabs
    : userRole === 'PARENT'
      ? parentTabs
      : teacherTabs;

  const tabs = isOnline ? baseTabs : baseTabs.filter((t) => !t.onlineOnly);

  return (
    <nav
      aria-label="شريط التنقل السفلي للهواتف"
      className="lg:hidden pb-[env(safe-area-inset-bottom,0px)] h-[calc(4rem+env(safe-area-inset-bottom,0px))] fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg shadow-neutral-900/5 transition-all"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== '/teacher/dashboard' && pathname?.startsWith(tab.href));

          if (tab.isHighlighted) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-5 group"
                aria-label={tab.label}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isActive
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100 shadow-primary-600/30'
                      : 'bg-primary-600 text-white shadow-primary-600/25 group-hover:bg-primary-700'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-primary-700 font-extrabold' : 'text-neutral-600'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'text-primary-600 font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-primary-50 text-primary-600' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* More / Menu Drawer Toggle Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-neutral-500 hover:text-neutral-800 transition-all active:scale-95"
          aria-label="المزيد من القوائم"
        >
          <div className="p-1 rounded-lg hover:bg-neutral-100">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">المزيد</span>
        </button>
      </div>
    </nav>
  );
}
