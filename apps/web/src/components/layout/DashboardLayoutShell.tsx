'use client';

import React from 'react';
import { MobileBottomNav } from '@/components/navigation';
import { useDashboardLayout } from './useDashboardLayout';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { DashboardModals } from './DashboardModals';
import { DashboardSkeleton } from './DashboardSkeleton';

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isDesktopSidebarCollapsed,
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
  } = useDashboardLayout();

  if (!isMounted || !isInitialized) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated && (typeof navigator === 'undefined' || navigator.onLine || !user)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        جاري التوجيه إلى تسجيل الدخول...
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] bg-neutral-50 flex flex-col lg:flex-row overflow-hidden">
      <DashboardSidebar
        isMobileSidebarOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktopSidebar={toggleDesktopSidebar}
        user={user}
        canSwitchRoles={canSwitchRoles}
        availableRoles={availableRoles}
        isSwitchingRole={isSwitchingRole}
        onSwitchRole={handleSwitchRole}
        navigationSections={navigationSections}
        pathname={pathname}
        pendingReservationsCount={pendingReservationsCount}
        unreadInquiriesCount={unreadInquiriesCount}
        onOpenWhatsAppManager={() => setIsWhatsAppManagerOpen(true)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <DashboardHeader
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleDesktopSidebar={toggleDesktopSidebar}
          user={user}
          isOnline={isOnline}
          isSyncMenuOpen={isSyncMenuOpen}
          setIsSyncMenuOpen={setIsSyncMenuOpen}
          pendingSyncCount={pendingSyncCount}
          onOpenSyncReview={() => setIsSyncReviewOpen(true)}
          onOpenActivityDrawer={() => setIsActivityDrawerOpen(true)}
          unreadNotificationsCount={shellBadges?.unreadNotifications}
          canSwitchRoles={canSwitchRoles}
          availableRoles={availableRoles}
          isSwitchingRole={isSwitchingRole}
          onSwitchRole={handleSwitchRole}
          isProfileMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          onLogout={logout}
        />

        <main
          ref={mainScrollRef}
          className="flex-1 min-h-0 w-full overflow-x-hidden overflow-y-auto custom-scrollbar pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-10 pt-3 px-3 sm:px-6"
        >
          <div
            className={`mx-auto w-full min-h-full transition-all duration-300 ${
              isDesktopSidebarCollapsed ? 'max-w-[1600px]' : 'max-w-7xl'
            }`}
          >
            {children}
          </div>
        </main>

        <MobileBottomNav
          userRole={user?.role}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <DashboardModals
          isSyncReviewOpen={isSyncReviewOpen}
          setIsSyncReviewOpen={setIsSyncReviewOpen}
          isSyncConfirmationOpen={isSyncConfirmationOpen}
          setIsSyncConfirmationOpen={setIsSyncConfirmationOpen}
          isActivityDrawerOpen={isActivityDrawerOpen}
          setIsActivityDrawerOpen={setIsActivityDrawerOpen}
          isWhatsAppManagerOpen={isWhatsAppManagerOpen}
          setIsWhatsAppManagerOpen={setIsWhatsAppManagerOpen}
          LogoutConfirmation={LogoutConfirmation}
        />
      </div>
    </div>
  );
}
