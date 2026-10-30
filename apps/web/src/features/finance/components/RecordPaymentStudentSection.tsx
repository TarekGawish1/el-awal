'use client';

import React from 'react';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/Label';

interface RecordPaymentStudentSectionProps {
  paymentType: 'TUITION' | 'BOOKLET';
  selectedGroupId: string;
  filteredStudents: any[];
  showOnlyUnpaid: boolean;
  onToggleShowOnlyUnpaid: () => void;
  studentSearchQuery: string;
  onStudentSearchQueryChange: (q: string) => void;
  selectedStudentId?: string;
  onStudentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedBookletId?: string;
  onBookletChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  eligibleBooklets: any[];
  booklets: any[];
  selectedStudent?: any;
  groupFee: number;
  isPending: boolean;
  isDefaultersLoading: boolean;
  isEnrollmentsLoading: boolean;
  isBookletsLoading: boolean;
  isBookletAlreadyPaid: boolean;
  getStudentBookletPaymentStatus: (studentId: string, bookletId?: string) => any;
  studentIdError?: string;
  bookletIdError?: string;
}

export function RecordPaymentStudentSection({
  paymentType,
  selectedGroupId,
  filteredStudents,
  showOnlyUnpaid,
  onToggleShowOnlyUnpaid,
  studentSearchQuery,
  onStudentSearchQueryChange,
  selectedStudentId,
  onStudentChange,
  selectedBookletId,
  onBookletChange,
  eligibleBooklets,
  booklets,
  selectedStudent,
  groupFee,
  isPending,
  isDefaultersLoading,
  isEnrollmentsLoading,
  isBookletsLoading,
  isBookletAlreadyPaid,
  getStudentBookletPaymentStatus,
  studentIdError,
  bookletIdError,
}: RecordPaymentStudentSectionProps) {
  return (
    <>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="block text-xs font-bold text-slate-700">
            الطالب <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2 text-[11px]">
            {selectedGroupId && (
              <span className="font-semibold text-primary-600">
                {filteredStudents.length} طالب متاح
              </span>
            )}
            <button
              type="button"
              onClick={onToggleShowOnlyUnpaid}
              className="text-xs font-bold text-slate-500 hover:text-primary-600 transition-colors cursor-pointer"
            >
              {showOnlyUnpaid
                ? '(عرض جميع الطلاب)'
                : paymentType === 'BOOKLET'
                ? '(غير المسددين للمذكرة فقط)'
                : '(غير المسددين فقط)'}
            </button>
          </div>
        </div>

        {/* Instant Search Input */}
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم الطالب أو الكود STU..."
            value={studentSearchQuery}
            onChange={(e) => onStudentSearchQueryChange(e.target.value)}
            className="w-full h-9 rounded-xl border border-slate-200 pr-9 pl-3 text-xs focus:ring-2 focus:ring-primary/20 bg-slate-50/60 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
          />
        </div>

        <select
          className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
          value={selectedStudentId || ''}
          onChange={onStudentChange}
          disabled={isPending || isDefaultersLoading || isEnrollmentsLoading}
        >
          <option value="">
            {isDefaultersLoading || isEnrollmentsLoading
              ? 'جاري تحميل قائمة الطلاب...'
              : filteredStudents.length === 0
              ? '-- لا يوجد طلاب مطابقين للبحث --'
              : '-- اختر طالباً --'}
          </option>
          {filteredStudents.map((s) => {
            const bookletStatus =
              paymentType === 'BOOKLET' && selectedBookletId
                ? getStudentBookletPaymentStatus(s.id, selectedBookletId)
                : null;

            return (
              <option key={s.id} value={s.id}>
                {s.name} {s.studentCode ? `[${s.studentCode}]` : ''}
                {paymentType === 'TUITION' &&
                  (s.rateMultiplier === 0
                    ? ' — (معفى من اشتراك الشهر الحالي — انضمام بعد يوم 20)'
                    : s.isPaid
                    ? ' — (مسدد بالفعل)'
                    : s.isPartiallyPaid
                    ? ` — (سداد جزئي: مدفوع ${s.amountPaid} ج.م • متبقي ${s.remainingAmount} ج.م)`
                    : s.rateMultiplier === 0.5
                    ? ` — (نصف شهر — المطلوب: ${s.fee} ج.م)`
                    : ` — (غير مسدد — المطلوب: ${s.fee} ج.م)`)}
                {paymentType === 'BOOKLET' &&
                  bookletStatus &&
                  (bookletStatus.isPaid
                    ? ' — (مسدد بالفعل — تم الاستلام)'
                    : bookletStatus.isPartiallyPaid
                    ? ` — (سداد جزئي: مدفوع ${bookletStatus.amountPaid} ج.م • متبقي ${bookletStatus.remainingAmount} ج.م)`
                    : ` — (غير مسدد — المطلوب: ${bookletStatus.expected} ج.م)`)}
              </option>
            );
          })}
        </select>
        {studentIdError && (
          <p className="text-red-500 text-xs mt-1 font-medium">{studentIdError}</p>
        )}

        {paymentType === 'TUITION' &&
          selectedStudent &&
          selectedStudent.rateMultiplier !== undefined &&
          selectedStudent.rateMultiplier < 1.0 && (
            <div
              className={`mt-2 p-3 rounded-xl border flex items-start gap-2.5 text-xs font-bold animate-in fade-in ${
                selectedStudent.rateMultiplier === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  selectedStudent.rateMultiplier === 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <div>
                <div className="font-extrabold">
                  {selectedStudent.rateMultiplier === 0
                    ? 'إعفاء من اشتراك الشهر الحالي (طالب جديد)'
                    : 'اشتراك نصف شهر (انضمام منتصف الشهر)'}
                </div>
                <p className="text-[11px] font-medium mt-0.5 opacity-90">
                  {selectedStudent.calculationReason ||
                    (selectedStudent.rateMultiplier === 0
                      ? 'التحق الطالب بعد يوم 20 في الشهر، لذلك يعفى من اشتراك الشهر الحالي وتكون الرسوم 0 ج.م.'
                      : `التحق الطالب بين يوم 10 و 20 في الشهر، لذلك يُحسب 50% فقط (${selectedStudent.fee} ج.م بدلاً من ${groupFee} ج.م).`)}
                </p>
              </div>
            </div>
          )}

        {paymentType === 'BOOKLET' && isBookletAlreadyPaid && (
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>هذا الطالب قام بسداد واستلام هذه المذكرة مسبقاً بالكامل! (تم منع تكرار الدفع).</span>
          </div>
        )}
      </div>

      {paymentType === 'BOOKLET' && (
        <div>
          <Label className="mb-1.5 block text-xs font-bold text-slate-700">
            المذكرة / الملزمة الدراسية <span className="text-red-500">*</span>
          </Label>
          <select
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-purple-500/20 bg-white text-slate-800"
            value={selectedBookletId || ''}
            onChange={onBookletChange}
            disabled={isPending || isBookletsLoading}
          >
            <option value="">
              {isBookletsLoading
                ? 'جاري تحميل المذكرات...'
                : eligibleBooklets.length === 0
                ? booklets.length === 0
                  ? '-- لا توجد مذكرات مضافة في النظام --'
                  : '-- لا توجد مذكرات مطابقة لهذا الاختيار --'
                : `-- اختر المذكرة (${eligibleBooklets.length} متاح) --`}
            </option>
            {eligibleBooklets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} — {b.gradeLevel} ({b.price} ج.م)
              </option>
            ))}
          </select>
          {bookletIdError && (
            <p className="text-red-500 text-xs mt-1 font-medium">{bookletIdError}</p>
          )}
        </div>
      )}
    </>
  );
}
