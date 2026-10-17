'use client';

import React from 'react';
import { Check, CheckCircle2, Copy, GraduationCap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { StudentRegistrationCredentials } from '../../types/auth.types';

interface CredentialsScreenProps {
  credentials?: StudentRegistrationCredentials;
  copied?: string | null;
  onCopy?: (text: string, key: string) => void;
  onContinue: () => void;
  attendanceMode?: 'CENTER' | 'ONLINE';
}

export function CredentialsScreen({
  credentials,
  copied,
  onCopy,
  onContinue,
  attendanceMode,
}: CredentialsScreenProps) {
  const handleCopy = (text: string, key: string) => {
    if (onCopy) {
      onCopy(text, key);
    }
  };

  const copyAll = () => {
    if (!credentials) return;
    const text = [
      '🎓 بيانات حساب الطالب:',
      `• كود الطالب (ID): ${credentials.studentCode}`,
      credentials.studentPhone
        ? `• اسم المستخدم / الهاتف: ${credentials.studentPhone}`
        : `• اسم المستخدم للدخول: ${credentials.studentCode}`,
      `• كلمة المرور: ${credentials.studentPassword}`,
      `• رقم هاتف ولي الأمر: ${credentials.parentPhone || '-'}`,
    ].join('\n');

    handleCopy(text, 'all');
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 text-center" aria-live="polite">
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 shadow-inner">
          <CheckCircle2 className="h-11 w-11 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-extrabold text-neutral-900">تم إنشاء الحساب بنجاح</h3>
          <p className="text-sm font-medium text-neutral-500">
            احفظ بيانات الدخول الخاصة بك للدخول إلى حسابك في أي وقت
          </p>
        </div>
      </div>

      {credentials && (
        <div className="space-y-4 text-start">
          {/* Student Credentials Card */}
          <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/40 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-primary-100 pb-2.5">
              <div className="flex items-center gap-2 text-primary-900 font-extrabold text-sm">
                <GraduationCap className="h-5 w-5 text-primary-600" />
                <span>بيانات حساب الطالب</span>
              </div>
              <span className="text-[11px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                حساب الطالب
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Student Code / ID */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-primary-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-neutral-500 block">كود الطالب (ID)</span>
                  <span className="font-mono text-base font-extrabold text-primary-900" dir="ltr">
                    {credentials.studentCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.studentCode, 'studentCode')}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {copied === 'studentCode' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied === 'studentCode' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              {/* Student Phone or Code */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-primary-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-neutral-500 block">
                    {credentials.studentPhone ? 'رقم هاتف الطالب' : 'اسم المستخدم للدخول'}
                  </span>
                  <span className="font-mono text-sm font-bold text-neutral-900" dir="ltr">
                    {credentials.studentPhone || credentials.studentCode}
                  </span>
                </div>
                {credentials.studentPhone ? (
                  <button
                    type="button"
                    onClick={() => handleCopy(credentials.studentPhone!, 'studentPhone')}
                    className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {copied === 'studentPhone' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied === 'studentPhone' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                ) : null}
              </div>

              {/* Student Password */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-primary-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-neutral-500 block">كلمة المرور</span>
                  <span className="font-mono text-sm font-bold text-emerald-700" dir="ltr">
                    {credentials.studentPassword}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.studentPassword, 'studentPassword')}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {copied === 'studentPassword' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied === 'studentPassword' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Copy All Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyAll}
            className="w-full text-xs font-bold gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 rounded-xl py-2.5 cursor-pointer"
          >
            {copied === 'all' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied === 'all' ? 'تم نسخ بيانات الطالب بنجاح ✅' : 'نسخ بيانات حساب الطالب'}</span>
          </Button>

          {/* WhatsApp Notice reminder */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
            <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <div>
              <p className="font-bold text-emerald-950">إشعار ولي الأمر عبر واتساب:</p>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                سيتم إرسال بيانات الدخول الخاصة بولي الأمر والطالب تلقائياً في رسالة واتساب لرقم ولي الأمر فور قبول المعلم للحجز. 📲
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-md rounded-2xl py-4 flex items-center justify-center gap-2 text-base cursor-pointer"
          onClick={onContinue}
          aria-label={attendanceMode === 'ONLINE' ? 'الانتقال للوحة التحكم' : 'اختار المجموعة الدراسية'}
        >
          <span>{attendanceMode === 'ONLINE' ? 'الانتقال للوحة التحكم' : 'اختار المجموعة الدراسية'}</span>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
