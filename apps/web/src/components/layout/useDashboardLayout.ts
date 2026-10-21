'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useCurrentUser } from '@/features/auth';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { UserRole } from '@/features/auth/types/auth.types';
import {
  isRouteAllowedForRole,
  getRoleLandingRoute,
  getAvailableRoles,
  getRoleLabel as getRoleLabelUtil,
} from '@/features/auth/utils/role-routing';
import { switchRoleRequest } from '@/features/auth/api/auth.api';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { syncEngine } from '@/lib/offline/sync-engine';
import { getNavigationSectionsForRole } from '@/config/navigation';
import { useStudentProfile } from '@/features/student-portal/hooks/useStudentPortal';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useShellBadges } from '@/core/hooks/useShellBadges';
import { useRealtimeReservations } from '@/lib/realtime/useRealtimeReservations';
import { useRealtimeInquiries } from '@/lib/realtime/useRealtimeInquiries';
import { useRealtimeAttendance } from '@/lib/realtime/useRealtimeAttendance';
import { useRealtimeNotifications } from '@/lib/realtime/useRealtimeNotifications';
import { useWebPush } from '@/hooks/useWebPush';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function useDashboardLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isSyncReviewOpen, setIsSyncReviewOpen] = useState(false);
  const [isSyncConfirmationOpen, setIsSyncConfirmationOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isWhatsAppManagerOpen, setIsWhatsAppManagerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  // Initialize desktop sidebar collapse preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('el_awal_sidebar_collapsed');
      if (stored === 'true') {
        setIsDesktopSidebarCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('el_awal_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleDesktopSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isInitialized, logout, LogoutConfirmation } = useAuth();
  const { setSession } = useAuthStore();
  const isOnline = useOnlineStatus();
  const availableRoles = getAvailableRoles(user);

  const isStudent = user?.role === 'STUDENT' || (Boolean(pathname) && pathname.startsWith('/student'));
  const isTeacher = user?.role === 'TEACHER' || (Boolean(pathname) && pathname.startsWith('/teacher'));
  const canSwitchRoles = !isStudent && !isTeacher && availableRoles.length > 1;

  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top and set title on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }

    if (!pathname || typeof document === 'undefined') return;

    const pageTitles: Record<string, string> = {
      '/teacher/dashboard': 'لوحة التحكم',
      '/teacher/groups': 'المجموعات الدراسية',
      '/teacher/schedules': 'جدول الحصص والمواعيد',
      '/teacher/attendance': 'رصد الحضور والغياب',
      '/teacher/assessments': 'الواجبات والاختبارات',
      '/teacher/content': 'المحتوى والدروس',
      '/teacher/courses': 'الكورسات أونلاين',
      '/teacher/students': 'سجل الطلاب',
      '/teacher/reservations': 'طلبات الانضمام والقبول',
      '/teacher/notifications': 'مركز الإشعارات',
      '/teacher/inquiries': 'رسائل الموقع والاستفسارات',
      '/teacher/testimonials': 'آراء الطلاب',
      '/teacher/finance': 'الماليات والمصروفات',
      '/teacher/certificates': 'الشهادات التقديرية',
      '/teacher/assistants': 'إدارة المساعدين',
      '/teacher/activity-log': 'سجل النشاطات وتتبع العمليات',
      '/teacher/analytics': 'إحصائيات المنصة والزوار',
      '/teacher/performance': 'سرعة وأداء المنصة',
      '/teacher/settings': 'بيانات المدرس',
      '/student/dashboard': 'لوحة تحكم الطالب',
      '/student/homework': 'الواجبات المنزلية',
      '/student/assessments': 'الاختبارات',
      '/student/courses': 'الكورسات التعليمية',
      '/student/content': 'المحتوى والدروس',
      '/student/notifications': 'مركز الإشعارات',
      '/student/testimonials': 'شاركنا رأيك',
      '/parent/dashboard': 'لوحة متابعة ولي الأمر',
    };

    const direct = pageTitles[pathname];
    if (direct) {
      document.title = `${direct} | منصة الأول`;
    } else {
      const parts = pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      const isId = /^\d+$/.test(last) || last.length > 18 || /^[0-9a-fA-F-]{32,}$/.test(last);
      const prefix = isId ? 'تفاصيل' : last === 'new' || last === 'create' ? 'إضافة جديد' : last === 'edit' ? 'تعديل' : 'منصة الأول';
      document.title = `${prefix} | منصة الأول`;
    }
  }, [pathname]);

  // Sync engine listener
  useEffect(() => {
    setIsMounted(true);
    syncEngine.setQueryClient(queryClient);
    const unsubscribe = syncEngine.subscribe((event) => {
      setPendingSyncCount(event.pendingCount);
      if (event.type === 'SYNC_REVIEW_REQUIRED') {
        setIsSyncConfirmationOpen(true);
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Offline warming
  useEffect(() => {
    if (isMounted && isOnline && isAuthenticated) {
      const offlineRoutes =
        user?.role === 'STUDENT'
          ? ['/student/dashboard', '/student/group', '/student/attendance', '/student/payments']
          : user?.role === 'PARENT'
          ? ['/parent/dashboard']
          : [
              '/teacher/dashboard',
              '/teacher/attendance',
              '/teacher/finance',
              '/teacher/groups',
              '/teacher/students',
              '/teacher/schedules',
            ];

      const startBackgroundWarming = () => {
        if (
          typeof navigator !== 'undefined' &&
          'serviceWorker' in navigator &&
          navigator.serviceWorker.controller
        ) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'WARM_OFFLINE_SHELL',
              urls: offlineRoutes,
            });
          } catch {}
        }

        offlineRoutes.forEach((route, idx) => {
          setTimeout(() => {
            try {
              router.prefetch(route);
            } catch {}
          }, idx * 800);
        });
      };

      let idleId: number | undefined;
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          idleId = (window as any).requestIdleCallback(startBackgroundWarming, { timeout: 6000 });
        } else {
          startBackgroundWarming();
        }
      }, 1500);

      return () => {
        clearTimeout(timer);
        if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleId);
        }
      };
    }
  }, [isMounted, isOnline, isAuthenticated, user?.role, router]);

  // Silently re-hydrate user profile
  const { data: freshUser } = useCurrentUser({
    enabled: isMounted && isAuthenticated && isOnline,
  });

  useEffect(() => {
    if (freshUser && freshUser.id) {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;

      const freshAny = freshUser as any;
      const secId = freshUser.secretariatProfileId || freshAny.secretariatProfile?.id || (freshAny.assistantToTeachers?.length ? freshUser.id : undefined);
      const teachId = freshUser.teacherProfileId || freshAny.teacherProfile?.id;
      const parId = freshUser.parentProfileId || freshAny.parentProfile?.id;
      const studId = freshUser.studentProfileId || freshAny.studentProfile?.id;

      const hasChanged =
        currentUser.id !== freshUser.id ||
        currentUser.secretariatProfileId !== secId ||
        currentUser.teacherProfileId !== teachId ||
        currentUser.parentProfileId !== parId ||
        currentUser.studentProfileId !== studId ||
        currentUser.fullName !== (freshUser.fullName || freshAny.name) ||
        currentUser.phone !== (freshUser.phone || freshAny.phoneNumber);

      if (hasChanged) {
        useAuthStore.getState().setUser({
          ...currentUser,
          ...freshUser,
          secretariatProfileId: secId,
          teacherProfileId: teachId,
          parentProfileId: parId,
          studentProfileId: studId,
        });
      }
    }
  }, [freshUser]);

  // Auth route protection
  useEffect(() => {
    if (isMounted && isInitialized && !isAuthenticated) {
      if (!isOnline && user) return;
      const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${redirectParam}`);
    }
  }, [isMounted, isInitialized, isAuthenticated, pathname, router, user, isOnline]);

  // Role-based route boundary protection
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

  const handleSwitchRole = async (targetRole: UserRole) => {
    if (isSwitchingRole || isStudent || isTeacher || user?.role === targetRole) return;
    setIsSwitchingRole(true);
    setIsProfileMenuOpen(false);
    try {
      const newSession = await switchRoleRequest(targetRole);
      setSession(newSession);
      queryClient.clear();
      router.push(getRoleLandingRoute(targetRole));
      toast.success(`تم التبديل إلى: ${getRoleLabelUtil(targetRole)}`);
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء تبديل الدور');
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const { data: studentProfile } = useStudentProfile();
  const { permissions } = usePermissions();

  const navigationSections = getNavigationSectionsForRole(
    user?.role,
    isOnline,
    studentProfile?.attendanceMode,
    permissions
  );

  const isReservationsRole = user?.role === 'TEACHER' || user?.role === 'SECRETARIAT';
  const { data: shellBadges } = useShellBadges(isAuthenticated && isOnline);
  const pendingReservationsCount = shellBadges?.pendingReservations ?? 0;
  const unreadInquiriesCount = shellBadges?.unreadInquiries ?? 0;

  useRealtimeReservations(isReservationsRole && isOnline);
  useRealtimeAttendance(isReservationsRole && isOnline);
  useRealtimeInquiries(isReservationsRole && isOnline);
  useRealtimeNotifications(isOnline);
  useWebPush({ enabled: isAuthenticated && isMounted && isInitialized });

  return {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isDesktopSidebarCollapsed,
    setIsDesktopSidebarCollapsed,
    toggleDesktopSidebar,
    isSyncReviewOpen,
    setIsSyncReviewOpen,
    isSyncConfirmationOpen,
    setIsSyncConfirmationOpen,
    isActivityDrawerOpen,
    setIsActivityDrawerOpen,
    isWhatsAppManagerOpen,
    setIsWhatsAppManagerOpen,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    isSyncMenuOpen,
    setIsSyncMenuOpen,
    pendingSyncCount,
    isMounted,
    isSwitchingRole,
    pathname,
    user,
    isAuthenticated,
    isInitialized,
    logout,
    LogoutConfirmation,
    isOnline,
    availableRoles,
    canSwitchRoles,
    mainScrollRef,
    handleSwitchRole,
    navigationSections,
    shellBadges,
    pendingReservationsCount,
    unreadInquiriesCount,
  };
}
