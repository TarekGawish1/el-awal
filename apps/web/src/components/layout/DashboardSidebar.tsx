'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, X, ArrowLeftRight, LogOut } from 'lucide-react';
import { PwaInstallButton } from '@/components/pwa';
import { UserRole } from '@/features/auth/types/auth.types';

interface DashboardSidebarProps {
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
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
        className={`fixed inset-y-0 start-0 z-50 lg:z-auto w-64 max-w-[85vw] bg-white border-e border-neutral-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:h-full shrink-0 overflow-hidden pt-[env(safe-area-inset-top,0px)] ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
            <Link href={brandHref} className="flex items-center gap-2.5 group cursor-pointer" title="الذهاب للرئيسية">
              <div className="p-2 bg-primary-600 group-hover:bg-primary-700 text-white rounded-lg shadow-xs transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-neutral-900 text-base leading-tight tracking-tight group-hover:text-primary-700 transition-colors">
                  منصة الأول
                </h2>
                <span className="text-[11px] font-semibold text-primary-600 uppercase">نظام إدارة التعليم</span>
              </div>
            </Link>

            <button
              onClick={onCloseMobileSidebar}
              className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Role Switcher Banner for Mobile Sidebar */}
          {canSwitchRoles && (
            <div className="mx-3 mt-3 p-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between gap-2 shadow-xs">
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
          )}

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
                          onClick={onCloseMobileSidebar}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary-50/80 text-primary-700 font-semibold border-s-4 border-primary-600'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-600' : 'text-neutral-400'}`}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.badgeKey === 'reservations' && pendingReservationsCount > 0 && (
                            <span
                              className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none"
                              aria-label={`${pendingReservationsCount} طلب انضمام قيد الانتظار`}
                            >
                              {pendingReservationsCount > 99 ? '99+' : pendingReservationsCount}
                            </span>
                          )}
                          {item.badgeKey === 'inquiries' && unreadInquiriesCount > 0 && (
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
        <div className="p-3 border-t border-neutral-100 space-y-2 shrink-0 bg-white">
          {canSwitchRoles && (
            <button
              type="button"
              onClick={() => {
                onCloseMobileSidebar();
                const targetRole = user?.role === 'PARENT' ? 'SECRETARIAT' : 'PARENT';
                onSwitchRole(targetRole);
              }}
              disabled={isSwitchingRole}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeftRight className={`w-4 h-4 ${isSwitchingRole ? 'animate-spin' : ''}`} />
              <span>{user?.role === 'PARENT' ? 'التبديل لحساب المساعد' : 'التبديل لحساب ولي الأمر'}</span>
            </button>
          )}
          <PwaInstallButton className="w-full justify-center" />
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
