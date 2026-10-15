'use client';

import React, { useState, useEffect } from 'react';
import { X, KeyRound, Phone, AlertCircle, CheckCircle2, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { requestPasswordReset } from '../api/auth.api';
import { normalizeAuthErrorMessage } from '../hooks/useAuth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  role?: string;
}

export function ForgotPasswordModal({ isOpen, onClose, initialPhone = '', role }: ForgotPasswordModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
    }
  }, [initialPhone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) {
      setError(role === 'PARENT' ? 'يرجى إدخال رقم الهاتف أو كود الطالب' : 'يرجى إدخال رقم الهاتف المسجل');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await requestPasswordReset(trimmed, role);
      setIsSuccess(true);
      setCooldown(res.cooldownSeconds || 60);
    } catch (err: unknown) {
      setError(normalizeAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200 text-start">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 left-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl ring-4 ring-emerald-50/50">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 id="forgot-password-title" className="text-lg font-bold text-neutral-900">
              استعادة كلمة المرور
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              عبر رسالة فورية إلى حسابك على واتساب
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="animate-in fade-in-50 duration-200">
            <AlertCircle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertDescription className="text-xs font-semibold text-error-800">{error}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Success View */}
        {isSuccess ? (
          <div className="space-y-5 py-2 animate-in fade-in duration-200">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl space-y-2 text-start">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم إرسال الرابط بنجاح!</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                أرسلنا إليك رابطاً مباشراً عبر تطبيق <strong>واتساب</strong> إلى الرقم{' '}
                <span className="font-mono font-bold text-neutral-900 dir-ltr inline-block">{phone}</span>.
              </p>
              <div className="pt-2 text-[11px] text-emerald-700/90 flex items-center gap-1.5 font-medium">
                <span>⏱️ الرابط صالح لمدة 15 دقيقة فقط للاستخدام لمرة واحدة.</span>
              </div>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed text-center">
              افتح تطبيق واتساب على هاتفك، واضغط على الرابط لتحديد كلمة مرور جديدة لحسابك.
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleSend}
                disabled={isLoading || cooldown > 0}
                className="w-full text-xs font-bold"
              >
                {cooldown > 0 ? `إعادة الإرسال بعد (${cooldown}) ثانية` : 'إعادة إرسال الرابط'}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleClose}
                className="w-full font-bold"
              >
                حسناً، فهمت
              </Button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSend} className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              {role === 'PARENT'
                ? 'أدخل رقم هاتف الطالب أو ولي الأمر المسجل، وسنرسل لك رابطاً مشفراً عبر واتساب لتعيين كلمة مرور جديدة فوراً.'
                : 'أدخل رقم الهاتف المسجل به في المنصة، وسنرسل لك رابطاً مشفراً لتعيين كلمة مرور جديدة لحسابك فوراً.'}
            </p>

            <Input
              id="forgot-password-phone"
              name="phone"
              type="text"
              label={role === 'PARENT' ? 'رقم الهاتف أو كود الطالب' : 'رقم الهاتف المسجل'}
              placeholder={role === 'PARENT' ? 'أدخل رقم الهاتف أو كود الطالب' : '010XXXXXXXX'}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              required
              autoFocus
              dir="ltr"
              startIcon={<Phone className="w-4 h-4" />}
            />

            <div className="pt-2 flex flex-col sm:flex-row-reverse gap-2.5">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="flex-1 font-bold shadow-sm"
              >
                <MessageSquare className="w-4 h-4 me-2 text-emerald-300" />
                <span>إرسال رابط الاستعادة</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleClose}
                disabled={isLoading}
                className="sm:w-auto"
              >
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
