'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Phone, User } from 'lucide-react';
import { useTeacherProfile } from '@/features/teachers/hooks/useTeacherProfile';
import toast from 'react-hot-toast';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

export default function TeacherSettingsPage() {
  const { profile, isLoading, updateProfile, isUpdating } = useTeacherProfile();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setInitialized(true);
    }
  }, [profile, initialized]);

  const isDirty =
    initialized &&
    !!profile &&
    (fullName.trim() !== (profile.fullName || '') || phone.trim() !== (profile.phone || ''));

  const validate = (): string | null => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800">بيانات المدرس</h1>
        </div>
        <p className="text-neutral-500 font-medium mr-14">
          تحديث اسم المدرس ورقم الهاتف المعروض في المنصة.
        </p>
      </div>

      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-5 sm:p-7">
        {isLoading || !initialized ? (
          <p className="text-center text-neutral-500 py-8">جاري تحميل البيانات...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
              disabled={isUpdating || !isDirty}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
