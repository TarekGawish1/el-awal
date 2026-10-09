'use client';

import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  MessageCircle,
  ShieldCheck,
  Lock,
  Sparkles,
  Loader2,
  User,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useStudentCredentials,
  useResetStudentPassword,
  useResetParentPassword,
} from '../hooks/use-students';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

interface StudentPasswordModalProps {
  studentId: string | null;
  studentName?: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'student' | 'parent';
}

export function StudentPasswordModal({
  studentId,
  studentName = 'الطالب',
  isOpen,
  onClose,
  initialTab = 'student',
}: StudentPasswordModalProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'parent'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const { data: credentials, isLoading, refetch } = useStudentCredentials(
    studentId || '',
    isOpen,
  );
  const { mutate: resetPassword, isPending: isStudentPending } = useResetStudentPassword();
  const { mutate: resetParentPassword, isPending: isParentPending } = useResetParentPassword();

  // Student reset state
  const [newPassword, setNewPassword] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [copiedPin, setCopiedPin] = useState(false);
  const [lastResetResult, setLastResetResult] = useState<{
    newPassword: string;
    messageSent: boolean;
  } | null>(null);

  // Parent reset state
  const [parentNewPassword, setParentNewPassword] = useState('');
  const [parentSendWhatsApp, setParentSendWhatsApp] = useState(true);
  const [copiedParentPin, setCopiedParentPin] = useState(false);
  const [lastParentResetResult, setLastParentResetResult] = useState<{
    newPassword: string;
    messageSent: boolean;
    directLoginUrl?: string;
  } | null>(null);

  if (!isOpen || !studentId) return null;

  const handleCopy = async (text: string, isParent = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isParent) {
        setCopiedParentPin(true);
        setTimeout(() => setCopiedParentPin(false), 2000);
      } else {
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
      }
      toast.success('تم النسخ بنجاح ✅');
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  const handleGenerateRandomPin = (isParent = false) => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (isParent) {
      setParentNewPassword(pin);
    } else {
      setNewPassword(pin);
    }
  };

  const handleSubmitStudentReset = (e: React.FormEvent) => {
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

  const handleSubmitParentReset = (e: React.FormEvent) => {
    e.preventDefault();
    resetParentPassword(
      {
        studentId,
        payload: {
          newPassword: parentNewPassword.trim() || undefined,
          sendWhatsApp: parentSendWhatsApp,
        },
      },
      {
        onSuccess: (data) => {
          setLastParentResetResult({
            newPassword: data.newPassword,
            messageSent: data.messageSent,
            directLoginUrl: data.directLoginUrl,
          });
          setParentNewPassword('');
          refetch();
        },
      },
    );
  };

  const handleManualStudentWhatsApp = () => {
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

  const handleManualParentWhatsApp = () => {
    const phone = credentials?.parentPhone;
    if (!phone) {
      toast.error('لا يوجد رقم هاتف مسجل لولي الأمر');
      return;
    }
    const pass = lastParentResetResult?.newPassword || credentials?.parentPassword || '123456';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://al-awal.online';
    const directUrl = `${baseUrl}/parent-access?phone=${encodeURIComponent(phone)}&pass=${encodeURIComponent(pass)}`;
    const msg = `🔐 *إشعار بيانات دخول ولي الأمر - منصة الأوّل*

أهلاً بحضرتك أ/ ${credentials?.parentName || 'ولي الأمر'}،
بيانات الدخول لمتابعة الطالب/ة: *${credentials?.studentName || studentName}* (${credentials?.studentCode || ''}):

━━━━━━━━━━━━━━━━━━━
📌 *بيانات الدخول:*
▫️ *رقم الدخول / الهاتف:* ${phone}
▫️ *كلمة مرور ولي الأمر:* ${pass}
🔗 *رابط الدخول المباشر:* ${directUrl}
━━━━━━━━━━━━━━━━━━━
يمكنكم الضغط على الرابط أعلاه للدخول المباشر ومتابعة الحضور والدرجات دون الحاجة لكتابة البيانات 🌟`;
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
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5"
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

        {/* Tab Switcher: Student vs Parent */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'student'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4 text-primary-600" />
            <span>حساب الطالب</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'parent'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>حساب ولي الأمر</span>
            {credentials?.parentPassword && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="كلمة المرور مسجلة" />
            )}
          </button>
        </div>

        {/* TAB 1: STUDENT CREDENTIALS */}
        {activeTab === 'student' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
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
                  الرمز المؤقت / كلمة مرور الطالب المسجلة
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
            <form onSubmit={handleSubmitStudentReset} className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>إعادة تعيين فورية لكلمة مرور الطالب</span>
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
                    onClick={() => handleGenerateRandomPin(false)}
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
                disabled={isStudentPending}
              >
                {isStudentPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    <span>جاري الحفظ والتحديث...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    <span>حفظ وتحديث كلمة مرور الطالب</span>
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
                  onClick={handleManualStudentWhatsApp}
                  className="w-full bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5 ml-1.5 text-emerald-600" />
                  مشاركة البيانات عبر واتساب الآن
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PARENT CREDENTIALS */}
        {activeTab === 'parent' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Parent Account Summary */}
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">اسم ولي الأمر:</span>
                <span className="font-bold text-slate-800">
                  {credentials?.parentName || 'ولي الأمر'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">هاتف ولي الأمر (رقم الدخول):</span>
                <span className="font-mono text-slate-800 font-bold" dir="ltr">
                  {credentials?.parentPhone || 'غير مسجل'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">الطالب التابع له:</span>
                <span className="font-semibold text-slate-700">
                  {credentials?.studentName} ({credentials?.studentCode})
                </span>
              </div>
            </div>

            {/* Parent Password View */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  كلمة المرور المسجلة لحساب ولي الأمر
                </span>
                {credentials?.parentPassword ? (
                  <Badge variant="success" className="text-[10px]">
                    مسجلة
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px]">
                    غير مسجلة بعد
                  </Badge>
                )}
              </div>

              {credentials?.parentPassword ? (
                <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-emerald-800 block">كلمة مرور ولي الأمر الحالية:</span>
                    <span className="font-mono text-base font-bold text-emerald-950 tracking-wider">
                      {credentials.parentPassword}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(credentials.parentPassword!, true)}
                    className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  >
                    {copiedParentPin ? <Check className="w-3.5 h-3.5 ml-1" /> : <Copy className="w-3.5 h-3.5 ml-1" />}
                    <span>{copiedParentPin ? 'تم النسخ' : 'نسخ'}</span>
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl space-y-1">
                  <p className="font-medium">لم يتم حفظ كلمة مرور مخصصة لولي الأمر في النظام حتى الآن.</p>
                  <p className="text-[11px] text-slate-500">
                    يمكنك تعيين كلمة مرور جديدة أدناه، وسيتم حفظها وإرسالها فوراً لولي الأمر مع رابط الدخول المباشر.
                  </p>
                </div>
              )}
            </div>

            {/* Parent Reset Form */}
            <form onSubmit={handleSubmitParentReset} className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>إعادة تعيين كلمة مرور ولي الأمر</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  كلمة المرور الجديدة لولي الأمر
                </label>
                <Input
                  value={parentNewPassword}
                  onChange={(e) => setParentNewPassword(e.target.value)}
                  placeholder="مثال: 123456 أو كود خاص..."
                  className="bg-white text-sm"
                  dir="ltr"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setParentNewPassword('123456')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    تعيين: 123456
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomPin(true)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    توليد كود عشوائي
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={parentSendWhatsApp}
                  onChange={(e) => setParentSendWhatsApp(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>إرسال إشعار واتساب لولي الأمر بكلمة المرور ورابط الدخول المباشر تلقائياً</span>
              </label>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isParentPending || !credentials?.parentPhone}
              >
                {isParentPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    <span>جاري تحديث كلمة مرور ولي الأمر...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    <span>حفظ وتحديث كلمة مرور ولي الأمر</span>
                  </>
                )}
              </Button>
            </form>

            {/* Success Card or Manual WhatsApp Share for Parent */}
            {lastParentResetResult ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    تم تحديث كلمة مرور ولي الأمر بنجاح
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                    {lastParentResetResult.newPassword}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  {lastParentResetResult.messageSent
                    ? 'تم إرسال رسالة واتساب لولي الأمر تحتوي على كلمة المرور ورابط الدخول المباشر بنجاح ✅'
                    : 'تم حفظ كلمة المرور الجديدة في حساب ولي الأمر.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualParentWhatsApp}
                  className="w-full bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5 ml-1.5 text-emerald-600" />
                  إرسال / إعادة مشاركة الرابط عبر واتساب
                </Button>
              </div>
            ) : (
              credentials?.parentPhone && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualParentWhatsApp}
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold py-2.5 rounded-xl"
                >
                  <MessageCircle className="w-3.5 h-3.5 ml-1.5 text-emerald-600" />
                  مشاركة بيانات الدخول والرابط المباشر مع ولي الأمر عبر واتساب
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
