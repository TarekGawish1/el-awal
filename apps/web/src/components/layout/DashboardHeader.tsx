'use client';

import React from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  GraduationCap,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  ArrowLeftRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { DashboardBreadcrumbs } from '@/features/dashboard/components/DashboardBreadcrumbs';
import { AcademicPeriodSwitcher } from '@/features/groups/components/AcademicPeriodSwitcher';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { getRoleLabel as getRoleLabelUtil } from '@/features/auth/utils/role-routing';
import { UserRole } from '@/features/auth/types/auth.types';

interface DashboardHeaderProps {
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  user: any;
  isOnline: boolean;
  isSyncMenuOpen: boolean;
  setIsSyncMenuOpen: (open: boolean) => void;
  pendingSyncCount: number;
  onOpenSyncReview: () => void;
  onOpenActivityDrawer: () => void;
  unreadNotificationsCount?: number;
  canSwitchRoles: boolean;
  availableRoles: UserRole[];
  isSwitchingRole: boolean;
  onSwitchRole: (role: UserRole) => void;
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function DashboardHeader({
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  user,
  isOnline,
  isSyncMenuOpen,
  setIsSyncMenuOpen,
  pendingSyncCount,
  onOpenSyncReview,
  onOpenActivityDrawer,
  unreadNotificationsCount,
  canSwitchRoles,
  availableRoles,
  isSwitchingRole,
  onSwitchRole,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  onLogout,
}: DashboardHeaderProps) {
  const brandHref =
    user?.role === 'STUDENT'
      ? '/student/dashboard'
      : user?.role === 'PARENT'
      ? '/parent/dashboard'
      : '/teacher/dashboard';

  return (
    <header className="pt-[env(safe-area-inset-top,0px)] bg-white/95 border-b border-neutral-200 sticky top-0 z-30 lg:z-40 shadow-xs shrink-0 flex items-center justify-between px-2.5 sm:px-6 lg:px-8 min-h-[3.75rem] sm:min-h-[4rem] gap-1.5 sm:gap-4">
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 sm:p-2 rounded-md hover:bg-neutral-100 text-neutral-700 active:scale-95 transition-all"
          aria-label="تبديل القائمة الجانبية"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link
          href={brandHref}
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
        {user?.role !== 'STUDENT' && user?.role !== 'PARENT' && <AcademicPeriodSwitcher />}

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
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-black ms-1.5 ${
                    !isOnline ? 'bg-neutral-200 text-neutral-700' : 'bg-amber-600 text-white'
                  }`}
                >
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
                          onOpenActivityDrawer();
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
                        onOpenSyncReview();
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
        {isOnline && (
          <div className="shrink-0">
            <NotificationBell unreadCount={unreadNotificationsCount} />
          </div>
        )}

        {/* Quick Role Switch Button */}
        {canSwitchRoles && (
          <button
            type="button"
            onClick={() => {
              const targetRole =
                availableRoles.find((r) => r !== user?.role) ||
                (user?.role === 'PARENT' ? 'SECRETARIAT' : 'PARENT');
              onSwitchRole(targetRole);
            }}
            disabled={isSwitchingRole}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100/90 text-primary-700 border border-primary-200/90 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            title={`التبديل إلى ${user?.role === 'PARENT' ? 'حساب المساعد' : 'حساب ولي الأمر'}`}
            aria-label={`التبديل إلى ${user?.role === 'PARENT' ? 'حساب المساعد' : 'حساب ولي الأمر'}`}
          >
            <ArrowLeftRight className={`w-3.5 h-3.5 shrink-0 ${isSwitchingRole ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {user?.role === 'PARENT' ? 'التبديل لحساب المساعد' : 'التبديل لحساب ولي الأمر'}
            </span>
            <span className="sm:hidden text-[11px]">
              {user?.role === 'PARENT' ? 'المساعد' : 'ولي الأمر'}
            </span>
          </button>
        )}

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
              <span className="text-sm font-bold text-neutral-900 leading-none">
                {user?.fullName || 'المستخدم'}
              </span>
              <span className="text-[11px] font-medium text-neutral-500 leading-none mt-1">
                {user?.role === 'TEACHER'
                  ? 'مدرس معتمد'
                  : user?.role === 'STUDENT'
                  ? 'طالب'
                  : user?.role === 'PARENT'
                  ? 'ولي أمر'
                  : 'مساعد'}
              </span>
            </div>
            <ChevronDown
              className={`hidden sm:block w-4 h-4 text-neutral-400 transition-transform ${
                isProfileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute end-0 top-full mt-2 w-64 bg-white border border-neutral-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2.5 border-b border-neutral-100 sm:hidden">
                  <p className="text-sm font-bold text-neutral-900 truncate">
                    {user?.fullName || 'المستخدم'}
                  </p>
                </div>

                {/* Role Switcher Section */}
                {canSwitchRoles && (
                  <div className="px-1 py-1.5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 mb-1">
                      تبديل الدور
                    </p>
                    {availableRoles.map((role) => {
                      const isActive = user?.role === role;
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onSwitchRole(role);
                          }}
                          disabled={isSwitchingRole || isActive}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer
                            ${
                              isActive
                                ? 'bg-primary-50 text-primary-700 font-bold cursor-default'
                                : 'text-neutral-700 hover:bg-neutral-50 font-medium'
                            }
                            ${isSwitchingRole && !isActive ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isActive ? 'bg-primary-600' : 'bg-neutral-300'
                            }`}
                          />
                          <span>{getRoleLabelUtil(role)}</span>
                          {isActive && (
                            <span className="mr-auto text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-bold">
                              الحالي
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {canSwitchRoles && <div className="border-t border-neutral-100 my-0.5" />}

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 mt-0.5 text-sm font-medium text-error-600 hover:bg-error-50 rounded-lg transition-colors cursor-pointer"
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
  );
}
