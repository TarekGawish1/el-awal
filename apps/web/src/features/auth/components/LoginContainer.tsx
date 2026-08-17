'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Container Max Width */}
      <div className="w-full max-w-md space-y-8">
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
        <Card className="shadow-sm border-neutral-200/90 bg-white">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 text-start">
              <h2 className="text-base font-bold text-neutral-900">تسجيل الدخول</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                أدخل بيانات حسابك المعتمدة للمتابعة إلى لوحة التحكم
              </p>
            </div>

            <LoginForm />
          </CardContent>
        </Card>

        {/* Security & System Note Footer */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            <span>نظام تسجيل دخول مشفر وآمن عبر معايير JWT & Argon2</span>
          </div>

          <p className="text-[11px] text-neutral-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة الأول لإدارة التعليم
          </p>
        </div>
      </div>
    </div>
  );
}
