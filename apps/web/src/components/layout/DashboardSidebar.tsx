'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  X,
  ArrowLeftRight,
  LogOut,
  PanelRightClose,
} from 'lucide-react';
import { PwaInstallButton } from '@/components/pwa';
import { UserRole } from '@/features/auth/types/auth.types';

interface DashboardSidebarProps {
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  isDesktopSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
  user: any;
  canSwitchRoles: boolean;
  availableRoles: UserRole[];
  isSwitchingRole: boolean;
  onSwitchRole: (role: UserRole) => void;
  navigationSections: any[];
  pathname: string | null;
  pendingReservationsCount: number;
  unreadInquiriesCount: number;
  onOpenWhatsAppManager: () => void;
  onLogout: () => void;
}

export function DashboardSidebar({
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  isDesktopSidebarCollapsed = false,
  onToggleDesktopSidebar,
  user,
  canSwitchRoles,
  availableRoles,
  isSwitchingRole,
  onSwitchRole,
  navigationSections,
  pathname,
  pendingReservationsCount,
  unreadInquiriesCount,
  onOpenWhatsAppManager,
  onLogout,
}: DashboardSidebarProps) {
  const brandHref =
    user?.role === 'STUDENT'
      ? '/student/dashboard'
      : user?.role === 'PARENT'
      ? '/parent/dashboard'
      : '/teacher/dashboard';

  return (
    <>
      <aside
        className={`fixed inset-y-0 start-0 z-50 lg:z-auto bg-white border-e border-neutral-200/90 flex flex-col justify-between transition-all duration-300 ease-in-out lg:static lg:translate-x-0 lg:h-full shrink-0 overflow-hidden pt-[env(safe-area-inset-top,0px)] ${
          isDesktopSidebarCollapsed
            ? 'w-64 max-w-[85vw] lg:w-[4.75rem]'
            : 'w-64 max-w-[85vw]'
        } ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Logo Header */}
          <div
            className={`p-4 border-b border-neutral-100 flex items-center shrink-0 transition-all ${
              isDesktopSidebarCollapsed ? 'lg:px-2 lg:justify-center' : 'justify-between'
            }`}
          >
            <Link
              href={brandHref}
              className={`flex items-center gap-2.5 group cursor-pointer ${
                isDesktopSidebarCollapsed ? 'lg:justify-center' : ''
              }`}
              title="الذهاب للرئيسية"
            >
              <div className="p-2 bg-primary-600 group-hover:bg-primary-700 text-white rounded-lg shadow-xs transition-colors shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div
                className={`transition-opacity duration-200 ${
                  isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'
                }`}
              >
                <h2 className="font-extrabold text-neutral-900 text-base leading-tight tracking-tight group-hover:text-primary-700 transition-colors whitespace-nowrap">
                  منصة الأول
                </h2>
                <span className="text-[11px] font-semibold text-primary-600 uppercase whitespace-nowrap">
                  نظام إدارة التعليم
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobileSidebar}
              className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle button inside header when expanded */}
            {onToggleDesktopSidebar && !isDesktopSidebarCollapsed && (
              <button
                type="button"
                onClick={onToggleDesktopSidebar}
                className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="تصغير القائمة الجانبية (Ctrl+B)"
                aria-label="تصغير القائمة الجانبية"
              >
                <PanelRightClose className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              </button>
            )}
          </div>

          {/* Quick Role Switcher Banner for Mobile Sidebar / Collapsed rail */}
          {canSwitchRoles && (
            <div className={`mx-3 mt-3 ${isDesktopSidebarCollapsed ? 'lg:mx-2 lg:mt-2' : ''}`}>
              {/* Collapsed Icon Button on desktop */}
              {isDesktopSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => {
                    const targetRole =
                      availableRoles.find((r) => r !== user?.role) ||
                      (user?.role === 'PARENT' ? 'SECRETARIAT' : 'PARENT');
                    onSwitchRole(targetRole);
                  }}
                  disabled={isSwitchingRole}
                  className="hidden lg:flex w-full items-center justify-center p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-primary-600 shadow-2xs transition-colors cursor-pointer"
                  title={user?.role === 'PARENT' ? 'تبديل لحساب المساعد' : 'تبديل لحساب ولي الأمر'}
                >
                  <ArrowLeftRight className={`w-4 h-4 ${isSwitchingRole ? 'animate-spin' : ''}`} />
                </button>
              )}
              {/* Full Banner when expanded */}
              <div
                className={`p-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl items-center justify-between gap-2 shadow-xs ${
                  isDesktopSidebarCollapsed ? 'flex lg:hidden' : 'flex'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {user?.role === 'PARENT' ? 'حساب المساعد' : 'حساب ولي الأمر'}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">تبديل الحساب الحالي</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetRole =
                      availableRoles.find((r) => r !== user?.role) ||
                      (user?.role === 'PARENT' ? 'SECRETARIAT' : 'PARENT');
                    onCloseMobileSidebar();
                    onSwitchRole(targetRole);
                  }}
                  disabled={isSwitchingRole}
                  className="px-2.5 py-1 text-xs font-bold text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSwitchingRole ? 'جاري...' : 'تبديل'}
                </button>
              </div>
            </div>
          )}

          {/* Categorized Navigation Links */}
          <nav
            className={`py-4 overflow-y-auto flex-1 ${
              isDesktopSidebarCollapsed ? 'px-2 lg:px-2 space-y-4' : 'px-3 space-y-6'
            }`}
            aria-label="القائمة الرئيسية"
          >
            {navigationSections.map((section, sIdx) => {
              const sectionId = section.id || `sec-${sIdx}`;

              return (
                <div key={sectionId} className="space-y-1.5">
                  {section.title && (
                    <div className={`px-3 pb-1 ${isDesktopSidebarCollapsed ? 'lg:px-0' : ''}`}>
                      {isDesktopSidebarCollapsed ? (
                        <div
                          className="hidden lg:block w-7 h-px bg-neutral-200 mx-auto my-2"
                          title={section.title}
                        />
                      ) : null}
                      <h3
                        className={`text-[11px] font-medium text-neutral-400 uppercase tracking-wider select-none ${
                          isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'
                        }`}
                      >
                        {section.title}
                      </h3>
                    </div>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item: any) => {
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
                                onOpenWhatsAppManager();
                              }
                              onCloseMobileSidebar();
                            }}
                            title={item.label}
                            className={`w-full flex items-center rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors group cursor-pointer ${
                              isDesktopSidebarCollapsed
                                ? 'justify-start px-3.5 py-2.5 lg:justify-center lg:px-0 lg:py-2.5'
                                : 'gap-3 px-3.5 py-2.5'
                            }`}
                          >
                            <Icon className="w-5 h-5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                            <span className={`truncate ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                              {item.label}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobileSidebar}
                          title={item.label}
                          className={`flex items-center rounded-md text-sm font-medium transition-all group relative ${
                            isDesktopSidebarCollapsed
                              ? 'justify-start gap-3 px-3.5 py-2.5 lg:justify-center lg:gap-0 lg:px-0 lg:py-2.5'
                              : 'gap-3 px-3.5 py-2.5'
                          } ${
                            isActive
                              ? 'bg-primary-50/80 text-primary-700 font-semibold border-s-4 border-primary-600'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                          }`}
                        >
                          <div className="relative shrink-0 flex items-center justify-center">
                            <Icon
                              className={`w-5 h-5 shrink-0 ${
                                isActive ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600'
                              }`}
                            />
                            {/* Small notification dot indicator when collapsed on desktop */}
                            {isDesktopSidebarCollapsed && (
                              (item.badgeKey === 'reservations' && pendingReservationsCount > 0) ||
                              (item.badgeKey === 'inquiries' && unreadInquiriesCount > 0)
                            ) && (
                              <span className="hidden lg:block absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-primary-600 ring-2 ring-white animate-pulse" />
                            )}
                          </div>
                          <span className={`truncate ${isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                            {item.label}
                          </span>
                          {!isDesktopSidebarCollapsed && item.badgeKey === 'reservations' && pendingReservationsCount > 0 && (
                            <span
                              className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none"
                              aria-label={`${pendingReservationsCount} طلب انضمام قيد الانتظار`}
                            >
                              {pendingReservationsCount > 99 ? '99+' : pendingReservationsCount}
                            </span>
                          )}
                          {!isDesktopSidebarCollapsed && item.badgeKey === 'inquiries' && unreadInquiriesCount > 0 && (
                            <span
                              className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold leading-none animate-pulse"
                              aria-label={`${unreadInquiriesCount} رسالة موقع غير مقروءة`}
                            >
                              {unreadInquiriesCount > 99 ? '99+' : unreadInquiriesCount}
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
        <div
          className={`p-3 border-t border-neutral-100 space-y-2 shrink-0 bg-white transition-all ${
            isDesktopSidebarCollapsed ? 'lg:p-2' : ''
          }`}
        >
          {canSwitchRoles && (
            <button
              type="button"
              onClick={() => {
                onCloseMobileSidebar();
                const targetRole = user?.role === 'PARENT' ? 'SECRETARIAT' : 'PARENT';
                onSwitchRole(targetRole);
              }}
              disabled={isSwitchingRole}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors cursor-pointer ${
                isDesktopSidebarCollapsed ? 'lg:hidden' : 'flex'
              }`}
            >
              <ArrowLeftRight className={`w-4 h-4 ${isSwitchingRole ? 'animate-spin' : ''}`} />
              <span>{user?.role === 'PARENT' ? 'التبديل لحساب المساعد' : 'التبديل لحساب ولي الأمر'}</span>
            </button>
          )}

          <div className={isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}>
            <PwaInstallButton className="w-full justify-center" />
          </div>

          <button
            onClick={() => {
              onCloseMobileSidebar();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-error-600 hover:bg-error-50 rounded-lg transition-colors lg:hidden cursor-pointer"
            aria-label="تسجيل الخروج من الحساب"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>

          {/* Desktop Toggle Button at bottom */}
          {onToggleDesktopSidebar && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className={`hidden lg:flex w-full items-center p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold transition-colors cursor-pointer ${
                isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between'
              }`}
              title={isDesktopSidebarCollapsed ? 'توسيع القائمة (Ctrl+B)' : 'تصغير القائمة (Ctrl+B)'}
            >
              <div className="flex items-center gap-2">
                <PanelRightClose
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isDesktopSidebarCollapsed ? 'rotate-180 text-primary-600' : 'text-neutral-500'
                  }`}
                />
                <span className={isDesktopSidebarCollapsed ? 'lg:hidden' : 'block'}>
                  {isDesktopSidebarCollapsed ? 'توسيع' : 'تصغير القائمة'}
                </span>
              </div>
              {!isDesktopSidebarCollapsed && (
                <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
                  Ctrl+B
                </span>
              )}
            </button>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileSidebarOpen && (
        <div
          onClick={onCloseMobileSidebar}
          className="fixed inset-0 bg-neutral-900/60 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
