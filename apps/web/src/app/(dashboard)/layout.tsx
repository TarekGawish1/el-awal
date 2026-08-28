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
  RefreshCw,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { DashboardBreadcrumbs } from '@/features/dashboard/components/DashboardBreadcrumbs';
import { AcademicPeriodSwitcher } from '@/features/groups/components/AcademicPeriodSwitcher';
import { PwaInstallButton } from '@/components/pwa';
import { BootstrapProgressIndicator } from '@/components/pwa/BootstrapProgressIndicator';
import { MobileBottomNav } from '@/components/navigation';
import { SyncReviewModal, SyncConfirmationModal, OfflineActivityDrawer } from '@/components/sync';
import { getNavigationItemsForRole } from '@/config/navigation';
import { usePendingReservations } from '@/features/groups';
import { useRealtimeReservations } from '@/lib/realtime/useRealtimeReservations';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { syncEngine } from '@/lib/offline/sync-engine';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { WhatsAppConnectionManager } from '@/components/admin/WhatsAppConnectionManager';
import { isRouteAllowedForRole, getRoleLandingRoute } from '@/features/auth/utils/role-routing';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSyncReviewOpen, setIsSyncReviewOpen] = useState(false);
  const [isSyncConfirmationOpen, setIsSyncConfirmationOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isWhatsAppManagerOpen, setIsWhatsAppManagerOpen] = useState(false);
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

  // Role-Based Boundary Protection Guard (prevents cross-role flash)
  useEffect(() => {
    if (isMounted && isInitialized && isAuthenticated && user && pathname) {
      const isRoleSpecificPath =
        pathname.startsWith('/teacher') ||
        pathname.startsWith('/student') ||
        pathname.startsWith('/parent') ||
        pathname.startsWith('/secretariat');

      if (isRoleSpecificPath && !isRouteAllowedForRole(pathname, user.role)) {
        const correctRoute = getRoleLandingRoute(user.role);
        router.replace(correctRoute);
      }
    }
  }, [isMounted, isInitialized, isAuthenticated, user, pathname, router]);

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

  // Pending join-request count badge (teacher/secretariat only) — pushed live via WebSocket
  const isReservationsRole = user?.role === 'TEACHER' || user?.role === 'SECRETARIAT';
  const { data: pendingReservations } = usePendingReservations(isReservationsRole);
  const pendingReservationsCount = pendingReservations?.length ?? 0;
  useRealtimeReservations(isReservationsRole);

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
                  {item.href === '/teacher/reservations' && pendingReservationsCount > 0 && (
                    <span className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none" aria-label={`${pendingReservationsCount} طلب انضمام قيد الانتظار`}>
                      {pendingReservationsCount > 99 ? '99+' : pendingReservationsCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* WhatsApp Gateway Direct Sidebar Access (Teacher/Secretariat) */}
            {(user?.role === 'TEACHER' || user?.role === 'SECRETARIAT') && (
              <button
                type="button"
                onClick={() => {
                  setIsWhatsAppManagerOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-all border border-emerald-200/80 bg-emerald-50/40 mt-3 shadow-2xs"
              >
                <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                <span>ربط وإدارة الواتساب</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar PWA Install & Info Footer */}
        <div className="p-3 border-t border-neutral-100 space-y-2">
          <PwaInstallButton className="w-full justify-center" />
          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-error-600 hover:bg-error-50 rounded-lg transition-colors lg:hidden cursor-pointer"
            aria-label="تسجيل الخروج من الحساب"
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

      {/* Main Page Workspace & Header Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global Navigation Header */}
        <header className="pt-[env(safe-area-inset-top,0px)] bg-white/95 border-b border-neutral-200 sticky top-0 z-40 shadow-xs shrink-0 flex items-center justify-between px-2.5 sm:px-6 lg:px-8 min-h-[3.75rem] sm:min-h-[4rem] gap-1.5 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-md hover:bg-neutral-100 text-neutral-700 active:scale-95 transition-all"
              aria-label="تبديل القائمة الجانبية"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link
              href={user?.role === 'STUDENT' ? '/student/dashboard' : user?.role === 'PARENT' ? '/parent/dashboard' : '/teacher/dashboard'}
              className="lg:hidden flex items-center gap-1.5 group cursor-pointer shrink-0"
              title="الذهاب للرئيسية"
            >
              <div className="p-1.5 bg-primary-600 text-white rounded-lg group-hover:bg-primary-700 transition-colors shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-neutral-900 text-sm hidden md:block group-hover:text-primary-700 transition-colors">
                منصة الأول التعليمية
              </span>
            </Link>
            
            <div className="hidden lg:block ms-2 border-s border-neutral-200 ps-4">
              <DashboardBreadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 shrink-0">
            {user?.role !== 'STUDENT' && user?.role !== 'PARENT' && (
              <AcademicPeriodSwitcher />
            )}

            {/* Pending Actions Button - visible while offline with queued mutations */}
            {!isOnline && pendingSyncCount > 0 && (
              <button
                onClick={() => setIsActivityDrawerOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 shadow-xs shrink-0"
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
              className={`flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                pendingSyncCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-xs animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="مراجعة المزامنة السحابية"
              aria-label="مراجعة المزامنة السحابية"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline ms-1.5">المزامنة</span>
              {pendingSyncCount > 0 && (
                <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-mono font-black ms-1">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* WhatsApp Gateway Quick Manager (Teachers & Secretariat) - Accessible in sidebar on mobile */}
            {(user?.role === 'TEACHER' || user?.role === 'SECRETARIAT') && (
              <button
                onClick={() => setIsWhatsAppManagerOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-xs shrink-0"
                title="إدارة ربط واتساب (WhatsApp Gateway)"
                aria-label="إدارة ربط واتساب"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="hidden md:inline">واتساب</span>
            </button>
            )}

            {/* Notification Bell Center */}
            <div className="hidden sm:block shrink-0">
              <NotificationCenter />
            </div>

            <div className="h-6 w-px bg-neutral-200 mx-0.5 hidden sm:block shrink-0"></div>

            <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
              <div className="relative cursor-pointer shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-50 border border-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs transition-transform hover:scale-105">
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

              {/* Desktop logout button */}
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-3 py-2 ms-1 text-sm font-medium text-neutral-500 hover:text-error-600 hover:bg-error-50 rounded-md transition-colors hidden sm:flex shrink-0 cursor-pointer"
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
              className="p-1.5 sm:p-2 text-neutral-500 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors sm:hidden shrink-0 flex items-center justify-center cursor-pointer"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen w-full overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-3 px-3 sm:px-6">
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

        {/* WhatsApp Gateway Quick Manager Modal */}
        <WhatsAppConnectionManager
          isOpen={isWhatsAppManagerOpen}
          onClose={() => setIsWhatsAppManagerOpen(false)}
        />

        {LogoutConfirmation}
      </div>
    </div>
  );
}
