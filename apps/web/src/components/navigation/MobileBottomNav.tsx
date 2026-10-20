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
  Plus,
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

  // Role-specific bottom navigation tabs with highlighted center action (Scoop / Notch FAB)
  const teacherTabs: NavTabItem[] = [
    { label: 'الرئيسية', href: '/teacher/dashboard', icon: LayoutDashboard, onlineOnly: false },
    { label: 'المجموعات', href: '/teacher/groups', icon: Users, onlineOnly: false },
    { label: 'رصد الحضور', href: '/teacher/attendance', icon: QrCode, isHighlighted: true, onlineOnly: false },
    { label: 'الجدول', href: '/teacher/schedules', icon: Calendar, onlineOnly: false },
  ];

  const studentTabs: NavTabItem[] = [
    { label: 'الرئيسية', href: '/student/dashboard', icon: LayoutDashboard, onlineOnly: false },
    { label: 'مجموعتي', href: '/student/group', icon: Users, onlineOnly: false },
    { label: 'الكورسات', href: '/student/courses', icon: BookOpen, isHighlighted: true, onlineOnly: true },
    { label: 'التقييمات', href: '/student/assessments', icon: FileText, onlineOnly: true },
  ];

  const parentTabs: NavTabItem[] = [
    { label: 'أبنائي', href: '/parent/dashboard', icon: LayoutDashboard, onlineOnly: false },
    { label: 'الرئيسية', href: '/parent/dashboard', icon: LayoutDashboard, isHighlighted: true, onlineOnly: false },
  ];

  const baseTabs: NavTabItem[] =
    userRole === 'STUDENT'
      ? studentTabs
      : userRole === 'PARENT'
        ? parentTabs
        : teacherTabs;

  const tabs = isOnline ? baseTabs : baseTabs.filter((t) => !t.onlineOnly);

  // Divide tabs into: Right side tabs, Center highlighted FAB tab, and Left side tabs
  const highlightedTab = tabs.find((t) => t.isHighlighted) || tabs[Math.floor(tabs.length / 2)];
  const nonHighlightedTabs = tabs.filter((t) => t !== highlightedTab);

  // In RTL Arabic layout:
  // rightTabs are rendered on the right side of the scoop
  // leftTabs are rendered on the left side of the scoop, followed by the "المزيد" menu button
  const rightTabs = nonHighlightedTabs.slice(0, 2);
  const leftTabs = nonHighlightedTabs.slice(2);

  const isHighlightedActive =
    pathname === highlightedTab.href ||
    (highlightedTab.href !== '/teacher/dashboard' &&
      highlightedTab.href !== '/student/dashboard' &&
      Boolean(pathname?.startsWith(highlightedTab.href)));

  const HighlightedIcon = highlightedTab.icon;

  return (
    <nav
      aria-label="شريط التنقل السفلي للهواتف"
      dir="rtl"
      className="lg:hidden pb-[env(safe-area-inset-bottom,0px)] h-[calc(4rem+env(safe-area-inset-bottom,0px))] fixed bottom-0 inset-x-0 z-40 select-none pointer-events-none"
    >
      {/* Scooped / Notched Curved Shell Background */}
      <div className="absolute inset-0 flex items-stretch pointer-events-none drop-shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {/* Right Wing (RTL) */}
        <div className="flex-1 bg-white border-t border-slate-200/90 rounded-tr-2xl" />

        {/* Center Scoop Notch (Fixed 96px width, never distorted) */}
        <div className="relative w-[96px] shrink-0 overflow-visible">
          <svg
            viewBox="0 0 96 64"
            className="w-[96px] h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Notch top border stroke */}
            <path
              d="M 0 0.5 C 22 0.5, 26 34, 48 34 C 70 34, 74 0.5, 96 0.5"
              stroke="#E2E8F0"
              strokeWidth="1.2"
              fill="none"
            />
            {/* Notch solid fill seamless with wings */}
            <path
              d="M 0 0.5 C 22 0.5, 26 34, 48 34 C 70 34, 74 0.5, 96 0.5 L 96 64 L 0 64 Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Left Wing (RTL) */}
        <div className="flex-1 bg-white border-t border-slate-200/90 rounded-tl-2xl" />
      </div>

      {/* Navigation Tabs and Floating Action Button Container */}
      <div className="relative z-10 w-full h-16 max-w-lg mx-auto flex items-center justify-between px-2 pointer-events-auto">
        {/* Right Tabs (e.g. الرئيسية, المجموعات) */}
        <div className="flex-1 flex items-center justify-around">
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              pathname === tab.href ||
              (tab.href !== '/teacher/dashboard' &&
                tab.href !== '/student/dashboard' &&
                Boolean(pathname?.startsWith(tab.href)));

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-95 ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-label={tab.label}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${
                    isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Center Floating Action Button (Elevated inside the curved scoop) */}
        <div className="w-[96px] shrink-0 flex flex-col items-center justify-center relative -top-3">
          <Link
            href={highlightedTab.href}
            className="relative group -top-2 flex flex-col items-center focus:outline-none"
            aria-label={highlightedTab.label}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ring-4 ring-white transition-all duration-200 active:scale-90 ${
                isHighlightedActive
                  ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.48)] scale-105'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_8px_20px_rgba(37,99,235,0.38)]'
              }`}
            >
              <HighlightedIcon className="w-7 h-7 stroke-[2.2]" />
            </div>
            <span
              className={`text-[10px] font-bold tracking-tight mt-1 transition-colors ${
                isHighlightedActive ? 'text-blue-600 font-extrabold' : 'text-slate-700'
              }`}
            >
              {highlightedTab.label}
            </span>
          </Link>
        </div>

        {/* Left Tabs (e.g. الجدول / التقييمات + المزيد) */}
        <div className="flex-1 flex items-center justify-around">
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              pathname === tab.href ||
              (tab.href !== '/teacher/dashboard' &&
                tab.href !== '/student/dashboard' &&
                Boolean(pathname?.startsWith(tab.href)));

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-95 ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-label={tab.label}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${
                    isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More / Menu Drawer Toggle Button */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-all duration-150 active:scale-95"
            aria-label="المزيد من القوائم"
          >
            <div className="p-1 rounded-lg text-slate-500">
              <Menu className="w-5 h-5 stroke-[1.8]" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium text-slate-500">
              المزيد
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
