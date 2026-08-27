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
  Download,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { DashboardBreadcrumbs } from '@/features/dashboard/components/DashboardBreadcrumbs';
import { AcademicPeriodSwitcher } from '@/features/groups/components/AcademicPeriodSwitcher';
import { PwaInstallButton } from '@/components/pwa';
import { BootstrapProgressIndicator } from '@/components/pwa/BootstrapProgressIndicator';
import { MobileBottomNav } from '@/components/navigation';
import { SyncReviewModal, SyncConfirmationModal, OfflineActivityDrawer } from '@/components/sync';
import { getNavigationItemsForRole } from '@/config/navigation';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { syncEngine } from '@/lib/offline/sync-engine';
import { RefreshCw, ListChecks } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSyncReviewOpen, setIsSyncReviewOpen] = useState(false);
  const [isSyncConfirmationOpen, setIsSyncConfirmationOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout, LogoutConfirmation } = useAuth();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setIsMounted(true);
    const unsubscribe = syncEngine.subscribe((event) => {
      setPendingSyncCount(event.pendingCount);
      if (event.type === 'SYNC_REVIEW_REQUIRED') {
        // Reconnection with pending offline actions: silent auto-sync is disabled,
        // require explicit user confirmation before dispatching anything to the server.
        setIsSyncConfirmationOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Authentication Route Protection
  useEffect(() => {
    if (isMounted && isInitialized && !isAuthenticated) {
      // Do not redirect to login when offline if a stored user exists
      if (!isOnline && user) {
        return;
      }
      const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${redirectParam}`);
    }
  }, [isMounted, isInitialized, isAuthenticated, pathname, router, user, isOnline]);

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

  const navigationItems = getNavigationItemsForRole(user?.role, isOnline);

  // Hydration-safe initial loading screen before auth initialization & client mount
  if (!isMounted || !isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        جاري التحقق من بيانات الدخول...
      </div>
    );
  }

  // If not authenticated, keep showing redirecting state while router pushes to /login
  if (!isAuthenticated && (typeof navigator === 'undefined' || navigator.onLine || !user)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        جاري التوجيه إلى تسجيل الدخول...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col lg:flex-row">

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 bg-white border-e border-neutral-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <Link
              href={user?.role === 'STUDENT' ? '/student/dashboard' : user?.role === 'PARENT' ? '/parent/dashboard' : '/teacher/dashboard'}
              className="flex items-center gap-2.5 group cursor-pointer"
              title="الذهاب للرئيسية"
            >
              <div className="p-2 bg-primary-600 group-hover:bg-primary-700 text-white rounded-lg shadow-xs transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-neutral-900 text-base leading-tight tracking-tight group-hover:text-primary-700 transition-colors">
                  منصة الأول
                </h2>
                <span className="text-[11px] font-semibold text-primary-600 uppercase">
                  نظام إدارة التعليم
                </span>
              </div>
            </Link>

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

        {/* Sidebar PWA Install & Info Footer */}
        <div className="p-3 border-t border-neutral-100">
          <PwaInstallButton className="w-full justify-center" />
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

      {/* Main Page Workspace & Header Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global Navigation Header */}
        <header className="bg-white border-b border-neutral-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-xs shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-neutral-100 text-neutral-700"
              aria-label="تبديل القائمة الجانبية"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link
              href={user?.role === 'STUDENT' ? '/student/dashboard' : user?.role === 'PARENT' ? '/parent/dashboard' : '/teacher/dashboard'}
              className="lg:hidden flex items-center gap-2 group cursor-pointer"
              title="الذهاب للرئيسية"
            >
              <div className="p-1.5 bg-primary-600 text-white rounded-lg group-hover:bg-primary-700 transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-neutral-900 text-sm hidden sm:block group-hover:text-primary-700 transition-colors">
                منصة الأول التعليمية
              </span>
            </Link>
            
            <div className="hidden lg:block ms-2 border-s border-neutral-200 ps-4">
              <DashboardBreadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {user?.role !== 'STUDENT' && user?.role !== 'PARENT' && (
              <AcademicPeriodSwitcher />
            )}

            {/* Pending Actions Button - visible while offline with queued mutations */}
            {!isOnline && pendingSyncCount > 0 && (
              <button
                onClick={() => setIsActivityDrawerOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 shadow-xs"
                title="عرض العمليات المعلقة"
                aria-label="عرض العمليات المعلقة"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span className="hidden md:inline">عرض العمليات المعلقة</span>
                <span className="bg-purple-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-mono font-black">
                  {pendingSyncCount}
                </span>
              </button>
            )}

            {/* Sync Review Button (shows when online with pending items or on click) */}
            <button
              onClick={() => setIsSyncReviewOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                pendingSyncCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-xs animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="مراجعة المزامنة السحابية"
              aria-label="مراجعة المزامنة السحابية"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">المزامنة</span>
              {pendingSyncCount > 0 && (
                <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-mono font-black">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* Notification Bell Center */}
            <NotificationCenter />

            <div className="h-8 w-px bg-neutral-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="relative cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shadow-sm transition-transform hover:scale-105">
                  {user?.fullName ? user.fullName.charAt(0) : 'م'}
                </div>
              </div>

              <div className="flex flex-col items-start hidden sm:flex text-start">
                <span className="text-sm font-bold text-neutral-900 leading-none mb-1">
                  {user?.fullName || 'المستخدم'}
                </span>
                <span className="text-[11px] font-medium text-neutral-500 leading-none">
                  {getRoleLabel(user?.role)}
                </span>
              </div>

              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-3 py-2 ms-1 text-sm font-medium text-neutral-500 hover:text-error-600 hover:bg-error-50 rounded-md transition-colors hidden sm:flex"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
            
            {/* Mobile logout button */}
            <button
                onClick={() => logout()}
                className="p-2 text-neutral-500 hover:text-error-600 hover:bg-error-50 rounded-full transition-colors sm:hidden"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-28 lg:pb-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto w-full min-h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          userRole={user?.role}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Floating Offline Bootstrap Hydration Indicator */}
        <BootstrapProgressIndicator />

        {/* Bi-Directional Sync Review Modal (manual, on-demand review) */}
        <SyncReviewModal
          isOpen={isSyncReviewOpen}
          onClose={() => setIsSyncReviewOpen(false)}
          onSuccess={() => {
            setIsSyncReviewOpen(false);
          }}
        />

        {/* Reconnection Confirmation Modal - blocks silent auto-syncing until the user decides */}
        <SyncConfirmationModal
          isOpen={isSyncConfirmationOpen}
          onClose={() => setIsSyncConfirmationOpen(false)}
        />

        {/* Offline Pending Activity Drawer */}
        <OfflineActivityDrawer
          isOpen={isActivityDrawerOpen}
          onClose={() => setIsActivityDrawerOpen(false)}
        />
        {LogoutConfirmation}
      </div>
    </div>
  );
}
