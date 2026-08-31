'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { DashboardBreadcrumbs } from '@/features/dashboard/components/DashboardBreadcrumbs';
import { AcademicPeriodSwitcher } from '@/features/groups/components/AcademicPeriodSwitcher';
import { PwaInstallButton } from '@/components/pwa';
import { BootstrapProgressIndicator } from '@/components/pwa/BootstrapProgressIndicator';
import { MobileBottomNav } from '@/components/navigation';
import { SyncReviewModal, SyncConfirmationModal, OfflineActivityDrawer } from '@/components/sync';
import { getNavigationSectionsForRole } from '@/config/navigation';
import { usePendingReservations } from '@/features/groups';
import { useRealtimeReservations } from '@/lib/realtime/useRealtimeReservations';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { syncEngine } from '@/lib/offline/sync-engine';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { WhatsAppConnectionManager } from '@/components/admin/WhatsAppConnectionManager';
import { isRouteAllowedForRole, getRoleLandingRoute } from '@/features/auth/utils/role-routing';
import { useStudentProfile } from '@/features/student-portal/hooks/useStudentPortal';

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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout, LogoutConfirmation } = useAuth();
  const isOnline = useOnlineStatus();
  
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top of main area when navigating between pages
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [pathname]);

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

  const { data: studentProfile } = useStudentProfile();
  const navigationSections = getNavigationSectionsForRole(user?.role, isOnline, studentProfile?.attendanceMode);

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
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
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
              className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categorized Navigation Links */}
          <nav className="px-3 py-4 overflow-y-auto flex-1 space-y-6" aria-label="القائمة الرئيسية">
            {navigationSections.map((section, sIdx) => {
              const sectionId = section.id || `sec-${sIdx}`;

              return (
                <div key={sectionId} className="space-y-1.5">
                  {section.title && (
                    <div className="px-3 pb-1">
                      <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider select-none">
                        {section.title}
                      </h3>
                    </div>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        !item.isAction &&
                        (pathname === item.href ||
                          (item.href !== '/teacher/dashboard' &&
                            item.href !== '/student/dashboard' &&
                            item.href !== '/parent/dashboard' &&
                            pathname?.startsWith(item.href)));

                      if (item.isAction) {
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => {
                              if (item.actionId === 'whatsapp-manager') {
                                setIsWhatsAppManagerOpen(true);
                              }
                              setIsMobileSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors group cursor-pointer"
                          >
                            <Icon className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                            <span>{item.label}</span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary-50/80 text-primary-700 font-semibold border-s-4 border-primary-600'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                          <span className="truncate">{item.label}</span>
                          {item.badgeKey === 'reservations' && pendingReservationsCount > 0 && (
                            <span
                              className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none"
                              aria-label={`${pendingReservationsCount} طلب انضمام قيد الانتظار`}
                            >
                              {pendingReservationsCount > 99 ? '99+' : pendingReservationsCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar PWA Install & Info Footer */}
        <div className="p-3 border-t border-neutral-100 space-y-2 shrink-0 bg-white">
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

            {/* Unified Cloud/Sync Status Dropdown */}
            {user?.role !== 'STUDENT' && user?.role !== 'PARENT' && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsSyncMenuOpen(!isSyncMenuOpen)}
                  className={`flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                    !isOnline
                      ? 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                      : pendingSyncCount > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-xs'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title="حالة المزامنة السحابية"
                  aria-haspopup="true"
                  aria-expanded={isSyncMenuOpen}
                >
                  {!isOnline ? (
                    <CloudOff className="w-4 h-4" />
                  ) : pendingSyncCount > 0 ? (
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  {pendingSyncCount > 0 && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-black ms-1.5 ${!isOnline ? 'bg-neutral-200 text-neutral-700' : 'bg-amber-600 text-white'}`}>
                      {pendingSyncCount}
                    </span>
                  )}
                </button>

                {isSyncMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSyncMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute end-0 top-full mt-2 w-64 bg-white border border-neutral-100 rounded-xl shadow-lg z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-2 py-1.5 mb-2 border-b border-neutral-100 flex items-center gap-2">
                        {!isOnline ? (
                          <>
                            <CloudOff className="w-4 h-4 text-neutral-500" />
                            <span className="text-sm font-semibold text-neutral-700">يعمل بدون إنترنت</span>
                          </>
                        ) : pendingSyncCount > 0 ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-700">توجد بيانات قيد المزامنة</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700">تمت المزامنة بنجاح</span>
                          </>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {!isOnline && pendingSyncCount > 0 && (
                          <button
                            onClick={() => {
                              setIsSyncMenuOpen(false);
                              setIsActivityDrawerOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <ListChecks className="w-4 h-4" />
                            <span>عرض العمليات المعلقة</span>
                            <span className="ms-auto bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 text-xs font-bold">
                              {pendingSyncCount}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsSyncMenuOpen(false);
                            setIsSyncReviewOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-neutral-500" />
                          <span>مراجعة المزامنة السحابية</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notification Bell Center */}
            <div className="shrink-0">
              <NotificationBell />
            </div>

            <div className="h-6 w-px bg-neutral-200 mx-0.5 hidden sm:block shrink-0"></div>

            {/* Profile Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1 sm:gap-2.5 p-1 rounded-lg hover:bg-neutral-50 transition-colors"
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-50 border border-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs transition-transform hover:scale-105">
                  {user?.fullName ? user.fullName.charAt(0) : 'م'}
                </div>
                <div className="flex-col items-start hidden sm:flex text-start">
                  <span className="text-sm font-bold text-neutral-900 leading-none mb-1">
                    {user?.fullName || 'المستخدم'}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-500 leading-none">
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
                <ChevronDown className={`hidden sm:block w-4 h-4 text-neutral-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute end-0 top-full mt-2 w-56 bg-white border border-neutral-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2.5 border-b border-neutral-100 sm:hidden">
                      <p className="text-sm font-bold text-neutral-900 truncate">{user?.fullName || 'المستخدم'}</p>
                      <p className="text-[11px] font-medium text-neutral-500 mt-0.5">{getRoleLabel(user?.role)}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm font-medium text-error-600 hover:bg-error-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          ref={mainScrollRef}
          className="flex-1 h-full w-full overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-3 px-3 sm:px-6"
        >
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
