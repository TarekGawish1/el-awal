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

  // Parent Portal has a dedicated clean, flat bottom bar (No Notch / No Fake Action Button)
  if (userRole === 'PARENT') {
    const isDashboardActive = pathname === '/parent/dashboard';

    return (
      <nav
        aria-label="شريط التنقل السفلي للهواتف"
        dir="rtl"
        className="lg:hidden pb-[env(safe-area-inset-bottom,0px)] h-[calc(4rem+env(safe-area-inset-bottom,0px))] fixed bottom-0 inset-x-0 z-40 select-none bg-white border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      >
        <div className="w-full h-16 max-w-sm mx-auto flex items-center justify-around px-6">
          <Link
            href="/parent/dashboard"
            onClick={(e) => {
              if (pathname === '/parent/dashboard') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-6 rounded-2xl transition-all duration-150 active:scale-95 ${
              isDashboardActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-label="أبنائي"
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                isDashboardActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
            </div>
            <span
              className={`text-[11px] mt-0.5 tracking-tight ${
                isDashboardActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
              }`}
            >
              أبنائي
            </span>
          </Link>

          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex flex-col items-center justify-center py-1.5 px-6 rounded-2xl text-slate-500 hover:text-slate-800 transition-all duration-150 active:scale-95 cursor-pointer"
            aria-label="المزيد من القوائم"
          >
            <div className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
              <Menu className="w-5 h-5 stroke-[1.8]" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium text-slate-500">
              المزيد
            </span>
          </button>
        </div>
      </nav>
    );
  }

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

  const baseTabs: NavTabItem[] = userRole === 'STUDENT' ? studentTabs : teacherTabs;
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

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (pathname === href) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const checkIsActive = (tab: NavTabItem) => {
    return (
      pathname === tab.href ||
      (tab.href !== '/teacher/dashboard' &&
        tab.href !== '/student/dashboard' &&
        Boolean(pathname?.startsWith(tab.href)))
    );
  };

  return (
    <nav
      aria-label="شريط التنقل السفلي للهواتف"
      dir="rtl"
      className="lg:hidden pb-[env(safe-area-inset-bottom,0px)] h-[calc(4rem+env(safe-area-inset-bottom,0px))] fixed bottom-0 inset-x-0 z-40 select-none pointer-events-none"
    >
      {/* Scooped / Notched Curved Shell Background */}
      <div className="absolute inset-0 pointer-events-none drop-shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex flex-col justify-between">
        {/* Top 64px (h-16) Bar containing the smooth Scoop Notch */}
        <div className="h-16 w-full flex items-stretch">
          {/* Right Wing (RTL) */}
          <div className="flex-1 bg-white border-t border-slate-200/90 rounded-tr-2xl" />

          {/* Center Scoop Notch — Clean, smooth Bézier cradle that dips down seamlessly */}
          <div className="relative w-[110px] h-16 shrink-0 -mx-[1px] overflow-hidden">
            <svg
              viewBox="0 0 110 64"
              className="w-full h-full"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Notch solid fill seamless with wings */}
              <path
                d="M 0 0 C 16 0, 22 6, 28 14 C 35 22, 44 36, 55 36 C 66 36, 75 22, 82 14 C 88 6, 94 0, 110 0 L 110 64 L 0 64 Z"
                fill="white"
              />
              {/* Notch top border stroke aligned with wing border-t */}
              <path
                d="M 0 0.6 C 16 0.6, 22 6, 28 14 C 35 22, 44 36, 55 36 C 66 36, 75 22, 82 14 C 88 6, 94 0.6, 110 0.6"
                stroke="#E2E8F0"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Left Wing (RTL) */}
          <div className="flex-1 bg-white border-t border-slate-200/90 rounded-tl-2xl" />
        </div>

        {/* Bottom Safe Area Inset Fill (Solid White) */}
        <div className="flex-1 bg-white w-full" />
      </div>

      {/* Navigation Tabs and Floating Action Button Container */}
      <div className="relative z-10 w-full h-16 max-w-lg mx-auto flex items-center justify-between px-2 pointer-events-auto">
        {/* Right Tabs */}
        <div className="flex-1 flex items-center justify-around pr-1 pl-1">
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = checkIsActive(tab);

            return (
              <Link
                key={tab.label + tab.href}
                href={tab.href}
                onClick={(e) => handleNavClick(e, tab.href)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 active:scale-95 ${
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

        {/* Center Floating Action Button */}
        <div className="w-[110px] shrink-0 flex items-center justify-center relative -top-6 pointer-events-auto">
          <Link
            href={highlightedTab.href}
            onClick={(e) => handleNavClick(e, highlightedTab.href)}
            className="relative group flex items-center justify-center focus:outline-none pointer-events-auto cursor-pointer"
            aria-label={highlightedTab.label}
          >
            <div
              className={`w-[54px] h-[54px] rounded-full flex items-center justify-center border-[3.5px] border-white transition-all duration-200 active:scale-90 ${
                isHighlightedActive
                  ? 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.45)] scale-105'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_6px_20px_rgba(37,99,235,0.38)]'
              }`}
            >
              <HighlightedIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="sr-only">{highlightedTab.label}</span>
          </Link>
        </div>

        {/* Left Tabs */}
        <div className="flex-1 flex items-center justify-around pl-1 pr-1">
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = checkIsActive(tab);

            return (
              <Link
                key={tab.label + tab.href}
                href={tab.href}
                onClick={(e) => handleNavClick(e, tab.href)}
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
