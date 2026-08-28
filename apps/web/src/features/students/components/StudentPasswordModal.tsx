'use client';

import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Send,
  MessageCircle,
  ShieldCheck,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useStudentCredentials, useResetStudentPassword } from '../hooks/use-students';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

interface StudentPasswordModalProps {
  studentId: string | null;
  studentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentPasswordModal({
  studentId,
  studentName = 'الطالب',
  isOpen,
  onClose,
}: StudentPasswordModalProps) {
  const { data: credentials, isLoading, refetch } = useStudentCredentials(
    studentId || '',
    isOpen,
  );
  const { mutate: resetPassword, isPending } = useResetStudentPassword();

  const [newPassword, setNewPassword] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [copiedPin, setCopiedPin] = useState(false);
  const [lastResetResult, setLastResetResult] = useState<{
    newPassword: string;
    messageSent: boolean;
  } | null>(null);

  if (!isOpen || !studentId) return null;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPin(true);
      toast.success('تم النسخ بنجاح ✅');
      setTimeout(() => setCopiedPin(false), 2000);
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  const handleGenerateRandomPin = () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pin);
  };

  const handleSubmitReset = (e: React.FormEvent) => {
    e.preventDefault();
    resetPassword(
      {
        studentId,
        payload: {
          newPassword: newPassword.trim() || undefined,
          sendWhatsApp,
        },
      },
      {
        onSuccess: (data) => {
          setLastResetResult({
            newPassword: data.newPassword,
            messageSent: data.messageSent,
          });
          setNewPassword('');
          refetch();
        },
      },
    );
  };

  const handleManualWhatsApp = () => {
    const phone = credentials?.parentPhone || credentials?.studentPhone;
    if (!phone) return;
    const pass = lastResetResult?.newPassword || credentials?.tempAccessPin || '123456';
    const msg = `أهلاً بحضرتك 🌸 تم تحديث بيانات دخول الطالب/ة ${credentials?.studentName || studentName} على منصة الأول:
- كود الطالب: ${credentials?.studentCode || ''}
- رقم الدخول: ${credentials?.studentPhone || ''}
- كلمة المرور: ${pass}
- رابط الدخول: https://al-awal.online/login`;
    window.open(`https://wa.me/${formatWhatsAppNumber(phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="إدارة كلمة المرور وبيانات الدخول"
    >
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600 border border-amber-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">كلمة المرور وبيانات الدخول</h2>
              <p className="text-xs text-slate-500 mt-0.5">{credentials?.studentName || studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Credential Summary */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">كود الطالب:</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {credentials?.studentCode || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">هاتف الطالب (اسم المستخدم):</span>
            <span className="font-mono text-slate-800" dir="ltr">
              {credentials?.studentPhone || '—'}
            </span>
          </div>
          {credentials?.parentPhone && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">هاتف ولي الأمر:</span>
              <span className="font-mono text-slate-800" dir="ltr">
                {credentials.parentPhone}
              </span>
            </div>
          )}
        </div>

        {/* Action 1: Temporary Access PIN View */}
        <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              الرمز المؤقت / كلمة المرور المسجلة
            </span>
            {credentials?.isPinActive ? (
              <Badge variant="success" className="text-[10px]">
                نشط وصالح
              </Badge>
            ) : (
              <Badge variant="default" className="text-[10px]">
                غير متوفر
              </Badge>
            )}
          </div>

          {credentials?.isPinActive && credentials.tempAccessPin ? (
            <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
              <div className="space-y-0.5">
                <span className="text-[11px] text-emerald-800 block">رمز الدخول الحالي:</span>
                <span className="font-mono text-base font-bold text-emerald-950 tracking-wider">
                  {credentials.tempAccessPin}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(credentials.tempAccessPin!)}
                className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 ml-1" /> : <Copy className="w-3.5 h-3.5 ml-1" />}
                <span>{copiedPin ? 'تم النسخ' : 'نسخ'}</span>
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
              لا يوجد رمز مؤقت مسجل حالياً. يمكنك توليد رمز أو تعيين كلمة مرور جديدة أدناه.
            </p>
          )}
        </div>

        {/* Action 2: Instant Reset Password Form */}
        <form onSubmit={handleSubmitReset} className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>إعادة تعيين فورية لكلمة المرور</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              كلمة المرور الجديدة (أو اختر من التوليد السريع)
            </label>
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="مثال: 123456 أو كلمة مخصصة..."
              className="bg-white text-sm"
              dir="ltr"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNewPassword('123456')}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                تعيين: 123456
              </button>
              <button
                type="button"
                onClick={handleGenerateRandomPin}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                توليد كود عشوائي
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span>إرسال كلمة المرور الجديدة لواتساب الطالب وولي الأمر فوراً تلقائياً</span>
          </label>

          <Button
            type="submit"
            variant="primary"
            className="w-full text-sm font-bold"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                <span>جاري الحفظ والتحديث...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 ml-2" />
                <span>حفظ وتحديث كلمة المرور</span>
              </>
            )}
          </Button>
        </form>

        {/* Success Card if reset just happened */}
        {lastResetResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                تم تحديث كلمة المرور بنجاح
              </span>
              <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                {lastResetResult.newPassword}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700">
              {lastResetResult.messageSent
                ? 'تم إرسال رسالة واتساب بالبيانات الجديدة لولي الأمر والطالب بنجاح ✅'
                : 'تم تغيير كلمة المرور في النظام.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualWhatsApp}
              className="w-full bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold"
            >
              <MessageCircle className="w-3.5 h-3.5 ml-1.5 text-emerald-600" />
              مشاركة البيانات عبر واتساب الآن
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
