'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Phone, User, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { useTeacherProfile } from '@/features/teachers/hooks/useTeacherProfile';
import toast from 'react-hot-toast';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|20|0)?1[0125]\d{8}$/;

export default function TeacherSettingsPage() {
  const { profile, isLoading, updateProfile, isUpdating, changePassword, isChangingPassword } =
    useTeacherProfile();

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setInitialized(true);
    }
  }, [profile, initialized]);

  const isProfileDirty =
    initialized &&
    !!profile &&
    (fullName.trim() !== (profile.fullName || '') || phone.trim() !== (profile.phone || ''));

  const validateProfile = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 3) {
      return 'الاسم يجب أن يكون 3 أحرف على الأقل';
    }
    if (!phone.trim()) {
      return 'رقم الهاتف مطلوب';
    }
    if (!EGYPTIAN_PHONE_REGEX.test(phone.trim())) {
      return 'رقم الهاتف غير صحيح (مثال: 01012345678)';
    }
    return null;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateProfile();
    if (error) {
      toast.error(error);
      return;
    }
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      toast.success('تم حفظ بيانات المدرس بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  const validatePassword = (): string | null => {
    if (!currentPassword) {
      return 'يرجى إدخال كلمة المرور الحالية';
    }
    if (!newPassword) {
      return 'يرجى إدخال كلمة المرور الجديدة';
    }
    if (newPassword.length < 6) {
      return 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل';
    }
    if (newPassword === currentPassword) {
      return 'كلمة المرور الجديدة لا يمكن أن تكون مطابقة لكلمة المرور الحالية';
    }
    if (newPassword !== confirmPassword) {
      return 'تأكيد كلمة المرور غير متطابق مع كلمة المرور الجديدة';
    }
    return null;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validatePassword();
    if (error) {
      toast.error(error);
      return;
    }
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(res?.message || 'تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Teacher Profile Header */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800">بيانات المدرس</h1>
        </div>
        <p className="text-neutral-500 font-medium mr-14">
          تحديث اسم المدرس ورقم الهاتف وكلمة المرور لتأمين الحساب.
        </p>
      </div>

      {/* Teacher Info Card */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-5 sm:p-7">
        {isLoading || !initialized ? (
          <p className="text-center text-neutral-500 py-8">جاري تحميل البيانات...</p>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div>
              <label htmlFor="teacher-fullName" className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1.5">
                <User className="w-4 h-4 text-neutral-400" />
                اسم المدرس
              </label>
              <input
                id="teacher-fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: أ. أحمد غريب"
                minLength={3}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
              />
            </div>

            <div>
              <label htmlFor="teacher-phone" className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1.5">
                <Phone className="w-4 h-4 text-neutral-400" />
                رقم الهاتف
              </label>
              <input
                id="teacher-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all text-left"
              />
              <p className="text-[11px] text-neutral-400 mt-1.5">
                رقم مصري صحيح (010 / 011 / 012 / 015). يُستخدم لتسجيل الدخول والتواصل.
              </p>
            </div>

            {profile?.email && (
              <div className="px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-100 text-sm text-neutral-500">
                البريد الإلكتروني المسجل: <span dir="ltr" className="font-bold text-neutral-700">{profile.email}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating || !isProfileDirty}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        )}
      </div>

      {/* Change Password Card */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-5 sm:p-7 space-y-5">
        <div className="flex items-start gap-3.5 pb-4 border-b border-neutral-100">
          <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-800">تغيير كلمة المرور</h2>
            <p className="text-sm text-neutral-500">
              قم بتحديث كلمة المرور الخاصة بحسابك لضمان أمان الوصول إلى المنصة.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="current-password"
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1.5"
            >
              <Lock className="w-4 h-4 text-neutral-400" />
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors p-1"
                aria-label={showCurrentPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="new-password"
                className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1.5"
              >
                <Lock className="w-4 h-4 text-neutral-400" />
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة مرور جديدة (6 أحرف فأكثر)"
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors p-1"
                  aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mb-1.5"
              >
                <Lock className="w-4 h-4 text-neutral-400" />
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors p-1"
                  aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {isChangingPassword ? 'جاري تحديث كلمة المرور...' : 'تحديث كلمة المرور'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

