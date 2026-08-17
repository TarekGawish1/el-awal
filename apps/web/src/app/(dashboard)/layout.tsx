'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  QrCode,
  FileText,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  GraduationCap,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout } = useAuth();

  // Authentication Route Protection
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${redirectParam}`);
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'TEACHER':
        return 'مدرس معتمد';
      case 'SECRETARIAT':
        return 'سكرتارية وإدارة';
      case 'STUDENT':
        return 'طالب';
      case 'PARENT':
        return 'ولي أمر';
      default:
        return 'مستخدم مسجل';
    }
  };

  const teacherNavigationItems = [
    { label: 'لوحة التحكم', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'المجموعات الدراسية', href: '/teacher/groups', icon: Calendar },
    { label: 'رصد الحضور والـ QR', href: '/teacher/attendance', icon: QrCode },
    { label: 'سجل الطلاب', href: '/teacher/students', icon: Users },
    { label: 'الواجبات والاختبارات', href: '/teacher/assessments', icon: FileText },
    { label: 'المحتوى والدروس', href: '/teacher/content', icon: BookOpen },
    { label: 'الماليات والمصروفات', href: '/teacher/finance', icon: DollarSign },
  ];

  const studentNavigationItems = [
    { label: 'الرئيسية', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'الدورات', href: '/student/courses', icon: BookOpen },
    { label: 'الاختبارات', href: '/student/assessments', icon: FileText },
    { label: 'الحضور', href: '/student/attendance', icon: QrCode },
    { label: 'المدفوعات', href: '/student/payments', icon: DollarSign },
  ];

  const navigationItems = user?.role === 'STUDENT' ? studentNavigationItems : teacherNavigationItems;

  // Hydration-safe initial loading screen before auth initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        جاري التحقق من بيانات الدخول...
      </div>
    );
  }

  // If not authenticated, keep showing redirecting state while router pushes to /login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        جاري التوجيه إلى تسجيل الدخول...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col lg:flex-row">
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-700"
            aria-label="تبديل القائمة الجانبية"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-600 text-white rounded-lg">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-neutral-900 text-sm">منصة الأول التعليمية</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md" aria-label="الإشعارات">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 bg-white border-e border-neutral-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-600 text-white rounded-lg shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-neutral-900 text-base leading-tight tracking-tight">
                  منصة الأول
                </h2>
                <span className="text-[11px] font-semibold text-primary-600 uppercase">
                  نظام إدارة التعليم
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="القائمة الرئيسية">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold border-e-4 border-primary-600 shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-neutral-100 space-y-1">
          <div className="p-3 rounded-lg bg-neutral-50 flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {user?.fullName ? user.fullName.charAt(0) : 'م'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-neutral-900 truncate">
                {user?.fullName || 'المستخدم'}
              </h4>
              <span className="text-[11px] text-neutral-500 block truncate">
                {user?.email || user?.phone || getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3.5 py-2 text-xs font-medium text-error-600 hover:bg-error-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-neutral-900/40 z-30 lg:hidden backdrop-blur-xs"
          aria-hidden="true"
        />
      )}

      {/* Main Page Workspace */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
