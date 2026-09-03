'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Phone,
  Copy,
  Check,
  UploadCloud,
  Clock,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useSubmitCourseSubscription, useEnrollInCourse, useCourseSubscriptionStatus } from '../hooks/useStudentPortal';
import { FileUploadZone } from '../../courses/components/FileUploadZone';
import toast from 'react-hot-toast';

interface CourseSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    price?: number | string;
    teacherName?: string;
    teacherPhone?: string;
    subject?: string;
    gradeLevel?: string;
  };
  onSuccess?: () => void;
}

export function CourseSubscriptionModal({
  isOpen,
  onClose,
  course,
  onSuccess,
}: CourseSubscriptionModalProps) {
  const coursePrice = Number(course.price || 0);
  const isFree = coursePrice === 0;

  // Wallet number to receive Vodafone Cash (instructor phone or fallback wallet)
  const vodafoneCashNumber = course.teacherPhone || '01012345678';

  const [copied, setCopied] = useState(false);
  const [senderPhone, setSenderPhone] = useState('');
  const [transferAmount, setTransferAmount] = useState(coursePrice.toString());
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);

  const { data: subStatus, isLoading: isStatusLoading } = useCourseSubscriptionStatus(course.id);
  const submitSubscription = useSubmitCourseSubscription();
  const directEnroll = useEnrollInCourse();

  const handleCopyNumber = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(vodafoneCashNumber);
      setCopied(true);
      toast.success('تم نسخ رقم فودافون كاش بنجاح 📋');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFree) {
      await directEnroll.mutateAsync(course.id);
      onSuccess?.();
      onClose();
      return;
    }

    if (!senderPhone.trim()) {
      toast.error('يرجى إدخال رقم المحفظة أو الهاتف الذي قمت بالتحويل منه');
      return;
    }

    if (!receiptUrl) {
      toast.error('يرجى إرفاق صورة إيصال التحويل أو سكرين شوت المعاملة');
      return;
    }

    await submitSubscription.mutateAsync({
      courseId: course.id,
      data: {
        senderPhone: senderPhone.trim(),
        transferAmount: Number(transferAmount) || coursePrice,
        receiptImageUrl: receiptUrl,
        paymentMethod: 'VODAFONE_CASH',
      },
    });

    onSuccess?.();
  };

  if (!isOpen) return null;

  const isPending = subStatus?.status === 'PENDING';
  const isRejected = subStatus?.status === 'DROPPED' && subStatus?.rejectionReason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        dir="rtl"
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">الاشتراك وتفعيل الكورس</h3>
                {isFree ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                    مجاني
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-100 border border-amber-300/30">
                    فودافون كاش
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-100 font-medium line-clamp-1 mt-0.5">
                {course.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Banners if already requested */}
          {isPending && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">طلبك قيد المراجعة حالياً ⏳</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  تم استلام طلب اشتراكك وإيصال التحويل بنجاح. يقوم المعلم حالياً بمطابقة التحويل وتفعيل وصولك الكامل للكورس فوراً.
                </p>
                {subStatus?.senderPhone && (
                  <p className="text-[11px] text-amber-800 font-semibold mt-2">
                    الرقم المحول منه: <span className="font-mono">{subStatus.senderPhone}</span> • المبلغ: {subStatus.transferAmount} ج.م
                  </p>
                )}
              </div>
            </div>
          )}

          {isRejected && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-900">تعذر تأكيد التحويل السابق</h4>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  سبب الرفض: <strong>{subStatus.rejectionReason}</strong>. يمكنك إعادة إرفاق صورة إيصال واضحة أدناه للمراجعة مجدداً.
                </p>
              </div>
            </div>
          )}

          {/* Price Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">رسوم الاشتراك في الكورس</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{course.title}</h4>
            </div>
            <div className="text-left">
              <span className="text-xl font-black text-rose-600 font-mono">
                {isFree ? 'مجاناً' : `${coursePrice} ج.م`}
              </span>
            </div>
          </div>

          {!isFree && (
            <>
              {/* Vodafone Cash Transfer Instructions */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 to-red-50/40 border border-rose-100 space-y-3">
                <div className="flex items-center gap-2 text-rose-800">
                  <Phone className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold">بيانات تحويل فودافون كاش (Vodafone Cash)</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  يرجى تحويل مبلغ <strong className="text-rose-600 font-bold">{coursePrice} ج.م</strong> عبر فودافون كاش إلى الرقم التالي:
                </p>

                {/* Wallet Box with Copy Button */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-rose-200 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                      VF
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">رقم المحفظة المستلمة</span>
                      <span className="text-sm font-black font-mono tracking-wider text-slate-900">
                        {vodafoneCashNumber}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرقم</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Form to submit receipt details */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رقم الهاتف المحول منه <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="010XXXXXXXX"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المبلغ المحول (ج.م) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Receipt Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    صورة إيصال التحويل / سكرين شوت المعاملة <span className="text-rose-500">*</span>
                  </label>
                  <FileUploadZone
                    label="إرفاق صورة إيصال التحويل"
                    description="اسحب وأفلت صورة سكرين شوت التحويل هنا، أو انقر للاختيار"
                    accept="image/*"
                    fileCategory="image"
                    folder="payment-receipts"
                    currentFileUrl={receiptUrl}
                    currentFileKey={receiptKey}
                    onUploadComplete={(result) => {
                      setReceiptUrl(result.fileUrl);
                      setReceiptKey(result.fileKey);
                    }}
                    onRemoveFile={() => {
                      setReceiptUrl(null);
                      setReceiptKey(null);
                    }}
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitSubscription.isPending || !receiptUrl}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitSubscription.isPending ? (
                      <span>جاري إرسال الطلب والإيصال...</span>
                    ) : isPending ? (
                      <span>تحديث بيانات التحويل والإيصال</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>إرسال طلب الاشتراك وتأكيد التحويل</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {isFree && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                هذا الكورس مجاني ومتاح لجميع الطلاب المسجلين. يمكنك تفعيل الكورس فوراً والبدء في المشاهدة.
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={directEnroll.isPending}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {directEnroll.isPending ? 'جاري تفعيل الكورس...' : 'تفعيل الكورس المجاني الآن'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
