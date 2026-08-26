'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, UserPlus, UserRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { LoginForm } from './LoginForm';
import { useAuth } from '../hooks/useAuth';
import { getRoleLandingRoute, sanitizeRedirectUrl } from '../utils/role-routing';

export function LoginContainer() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();

  // If already authenticated, redirect to the requested route or role dashboard
  useEffect(() => {
    if (isInitialized && isAuthenticated && user) {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const requestedRedirect = searchParams?.get('redirect');
      const safeRedirect = sanitizeRedirectUrl(requestedRedirect);
      const destination = safeRedirect || getRoleLandingRoute(user.role);
      router.replace(destination);
    }
  }, [isInitialized, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center py-6 sm:py-12 px-3.5 sm:px-6 lg:px-8">
      {/* Container Max Width */}
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-primary-600 text-white rounded-2xl shadow-md ring-4 ring-primary-100 animate-in zoom-in-95 duration-200">
            <GraduationCap className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              منصة الأول التعليمية
            </h1>
            <p className="text-xs sm:text-sm font-medium text-neutral-500 max-w-xs mx-auto">
              بوابة الدخول الموحدة للمدرسين والطلاب وأولياء الأمور والسكرتارية
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-sm border-neutral-200/90 bg-white rounded-2xl sm:rounded-3xl">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-5 sm:mb-6 text-start">
              <h2 className="text-base font-bold text-neutral-900">تسجيل الدخول</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                أدخل بيانات حسابك المعتمدة للمتابعة إلى لوحة التحكم
              </p>
            </div>

            <LoginForm />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-neutral-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] text-neutral-400">أو</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/parent-access"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <UserRound className="h-4 w-4" />
                <span>دخول ولي الأمر</span>
              </Link>

              <Link
                href="/register/student"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>إنشاء حساب طالب</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Copyright Footer */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة الأول لإدارة التعليم
          </p>
        </div>
      </div>
    </div>
  );
}
