'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, BookOpen, UserCheck, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { useAuthStore } from '../store/auth.store';
import { switchRoleRequest } from '../api/auth.api';
import { getAvailableRoles, getRoleLandingRoute } from '../utils/role-routing';
import { UserRole } from '../types/auth.types';
import toast from 'react-hot-toast';

const ROLE_CONFIG: Record<UserRole, { label: string; description: string; icon: React.ReactNode; gradient: string; border: string; hoverBorder: string }> = {
  TEACHER: {
    label: 'مدرس',
    description: 'إدارة الكورسات والطلاب والمجموعات',
    icon: <BookOpen className="w-7 h-7" />,
    gradient: 'from-blue-500 to-indigo-600',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
  },
  SECRETARIAT: {
    label: 'مساعد / سكرتارية',
    description: 'مساعدة المدرس في إدارة الطلاب والحضور',
    icon: <ShieldCheck className="w-7 h-7" />,
    gradient: 'from-purple-500 to-violet-600',
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
  },
  STUDENT: {
    label: 'طالب',
    description: 'متابعة الكورسات والدروس والتقييمات',
    icon: <GraduationCap className="w-7 h-7" />,
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400',
  },
  PARENT: {
    label: 'ولي أمر',
    description: 'متابعة مستوى وحضور الأبناء',
    icon: <Users className="w-7 h-7" />,
    gradient: 'from-amber-500 to-orange-600',
    border: 'border-amber-200',
    hoverBorder: 'hover:border-amber-400',
  },
};

export function RoleSelectionContainer() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, setSession } = useAuthStore();
  const [switchingRole, setSwitchingRole] = useState<UserRole | null>(null);

  const availableRoles = getAvailableRoles(user);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // If user has only one role, skip and redirect directly
  useEffect(() => {
    if (isInitialized && isAuthenticated && user && availableRoles.length <= 1) {
      router.replace(getRoleLandingRoute(user.role));
    }
  }, [isInitialized, isAuthenticated, user, availableRoles.length, router]);

  const handleSelectRole = async (targetRole: UserRole) => {
    if (switchingRole) return;
    setSwitchingRole(targetRole);

    try {
      // If already on this role, just navigate
      if (user?.role === targetRole) {
        router.push(getRoleLandingRoute(targetRole));
        return;
      }

      // Call backend to switch role and get new tokens
      const newSession = await switchRoleRequest(targetRole);
      setSession(newSession);
      router.push(getRoleLandingRoute(targetRole));
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء تبديل الدور');
      setSwitchingRole(null);
    }
  };

  if (!isInitialized || !isAuthenticated || !user || availableRoles.length <= 1) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center py-6 sm:py-12 px-3.5 sm:px-6 lg:px-8" dir="rtl">
      <div className="w-full max-w-lg space-y-6 sm:space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-primary-600 text-white rounded-2xl shadow-md ring-4 ring-primary-100">
            <GraduationCap className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              مرحباً {user.fullName}
            </h1>
            <p className="text-sm font-medium text-neutral-500 max-w-sm mx-auto">
              لديك أكثر من دور في المنصة. اختر الدور الذي تريد الدخول به:
            </p>
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="grid gap-3 sm:gap-4">
          {availableRoles.map((role) => {
            const config = ROLE_CONFIG[role];
            const isCurrentRole = user.role === role;
            const isSwitching = switchingRole === role;

            return (
              <button
                key={role}
                onClick={() => handleSelectRole(role)}
                disabled={!!switchingRole}
                className={`w-full text-start flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 bg-white shadow-sm transition-all duration-200
                  ${isCurrentRole ? `${config.border} ring-2 ring-offset-1 ring-primary-200` : `border-neutral-100 ${config.hoverBorder}`}
                  ${switchingRole && !isSwitching ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
                `}
              >
                {/* Icon */}
                <div className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} text-white flex items-center justify-center shadow-sm`}>
                  {isSwitching ? <Loader2 className="w-6 h-6 animate-spin" /> : config.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-neutral-900">{config.label}</span>
                    {isCurrentRole && (
                      <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        الدور الحالي
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{config.description}</p>
                </div>

                {/* Arrow */}
                <div className="shrink-0 text-neutral-300">
                  <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Copyright Footer */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-400">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} منصة الأول لإدارة التعليم
          </p>
        </div>
      </div>
    </div>
  );
}
