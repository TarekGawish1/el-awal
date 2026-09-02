'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, BookOpen, CreditCard, Users, Filter, Loader2 } from 'lucide-react';
import { useRecordPayment, useGroupDefaulters } from '../hooks/useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { useGroups, useGroupStudents } from '@/features/groups/hooks/useGroups';
import { GRADE_LEVELS_BY_STAGE, inferStageFromGrade } from '@/lib/constants/grades';
import { TERM_MONTHS } from './FinanceFiltersBar';
import { PaymentStatus } from '../types/finance.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import toast from 'react-hot-toast';
import { formatBookletMismatchMessage, isBookletEligibleForStudent } from '../utils/bookletEligibility';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'يجب اختيار الطالب'),
  bookletId: z.string().optional(),
  amountPaid: z.number().min(0, 'المبلغ يجب أن يكون 0 أو أكثر'),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  allStudents?: Array<{
    id: string;
    fullName: string;
    studentCode?: string;
    gradeLevel?: string;
    groupId?: string;
    initialGroupId?: string;
    groupIds?: string[];
  }>;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  groupId = '',
  periodYear,
  periodMonth,
  allStudents = [],
}: Props) {
  const [paymentType, setPaymentType] = useState<'TUITION' | 'BOOKLET'>('TUITION');

  const { data: allGroups = [] } = useGroups();

  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId);
  const [selectedAcademicTerm, setSelectedAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => {
    return periodMonth && (periodMonth >= 8 || periodMonth === 1) ? 'FIRST_TERM' : 'SECOND_TERM';
  });
  const [currentPeriodMonth, setCurrentPeriodMonth] = useState<number>(periodMonth || new Date().getMonth() + 1);
  const [currentPeriodYear, setCurrentPeriodYear] = useState<number>(periodYear || new Date().getFullYear());

  useEffect(() => {
    if (groupId) {
      setSelectedGroupId(groupId);
      const found = allGroups.find((g) => g.id === groupId);
      if (found) {
        if (found.gradeLevel) setSelectedGradeLevel(found.gradeLevel);
        const stage = inferStageFromGrade(found.gradeLevel);
        if (stage) setSelectedStage(stage);
      }
    }
  }, [groupId, allGroups]);

  const stageGrades = GRADE_LEVELS_BY_STAGE[selectedStage] || [];
  const groupGrades = allGroups.map((g) => g.gradeLevel).filter(Boolean);
  const availableGrades = useMemo(() => {
    return Array.from(
      new Set([
        ...stageGrades,
        ...groupGrades.filter((grade) => !selectedStage || inferStageFromGrade(grade) === selectedStage),
      ]),
    );
  }, [selectedStage, stageGrades, groupGrades]);

  const filteredGroups = useMemo(() => {
    return allGroups.filter((g) => {
      if (selectedGradeLevel && g.gradeLevel !== selectedGradeLevel) return false;
      if (selectedStage && inferStageFromGrade(g.gradeLevel) !== selectedStage) return false;
      return true;
    });
  }, [allGroups, selectedGradeLevel, selectedStage]);

  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { data: defaultersData, isLoading: isDefaultersLoading } = useGroupDefaulters(
    selectedGroupId,
    currentPeriodYear,
    currentPeriodMonth,
  );
  const { data: groupEnrollments = [], isLoading: isEnrollmentsLoading } = useGroupStudents(selectedGroupId);
  const { booklets = [], isLoading: isBookletsLoading } = useBooklets();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const selectedStudentId = watch('studentId');
  const selectedBookletId = watch('bookletId');
  const defaulters = defaultersData?.defaulters || [];
  const currentGroupObj = allGroups.find((g) => g.id === selectedGroupId);
  const groupFee = Number(currentGroupObj?.monthlyFee) || 0;

  // Available students list combining defaulters and enrolled students with proper fee and status
  const availableStudents = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; fee: number; isPaid: boolean; studentCode?: string }
    >();

    // 1. Defaulters (unpaid students for the selected month)
    defaulters.forEach((d) => {
      map.set(d.studentId, {
        id: d.studentId,
        name: d.fullName,
        fee: d.monthlyFeeExpected || groupFee,
        isPaid: false,
        studentCode: d.studentCode || undefined,
      });
    });

    // 2. Enrolled students who already paid for this month
    groupEnrollments.forEach((e) => {
      if (e.student?.id && !map.has(e.student.id)) {
        map.set(e.student.id, {
          id: e.student.id,
          name: e.student.user?.name || 'طالب',
          fee: groupFee,
          isPaid: true,
          studentCode: e.student.code,
        });
      }
    });

    if (!selectedGroupId && allStudents.length > 0) {
      allStudents.forEach((s) => {
        if (!map.has(s.id)) {
          map.set(s.id, {
            id: s.id,
            name: s.fullName,
            fee: groupFee,
            isPaid: false,
            studentCode: s.studentCode,
          });
        }
      });
    }

    return Array.from(map.values());
  }, [defaulters, groupEnrollments, selectedGroupId, allStudents, groupFee]);

  const getStudentBookletContext = (studentId: string) => {
    const defaulter = defaulters.find((student) => student.studentId === studentId);
    const enrollment = groupEnrollments.find((e) => e.student?.id === studentId);
    const fullStudent = allStudents.find((student) => student.id === studentId);
    const groupIds = fullStudent?.groupIds || [
      fullStudent?.groupId || fullStudent?.initialGroupId || (defaulter ? selectedGroupId : ''),
    ].filter(Boolean);

    return {
      gradeLevel: fullStudent?.gradeLevel || defaulter?.gradeLevel || enrollment?.student?.gradeLevel || selectedGradeLevel,
      groupIds,
    };
  };

  const eligibleBooklets = useMemo(() => {
    if (!selectedStudentId) return [];
    const student = getStudentBookletContext(selectedStudentId);
    return booklets.filter((booklet) => isBookletEligibleForStudent(booklet, student));
  }, [booklets, selectedStudentId, defaulters, groupEnrollments, allStudents, selectedGroupId, selectedGradeLevel]);

  const handleStageChange = (newStage: string) => {
    setSelectedStage(newStage);
    setSelectedGradeLevel('');
    setSelectedGroupId('');
    setValue('studentId', '');
  };

  const handleGradeChange = (newGrade: string) => {
    setSelectedGradeLevel(newGrade);
    setSelectedGroupId('');
    setValue('studentId', '');
    if (newGrade && !selectedStage) {
      const st = inferStageFromGrade(newGrade);
      if (st) setSelectedStage(st);
    }
  };

  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    setValue('studentId', '');
    if (newGroupId) {
      const g = allGroups.find((item) => item.id === newGroupId);
      if (g) {
        if (g.gradeLevel) setSelectedGradeLevel(g.gradeLevel);
        const st = inferStageFromGrade(g.gradeLevel);
        if (st) setSelectedStage(st);
      }
    }
  };

  const handleTermChange = (term: 'FIRST_TERM' | 'SECOND_TERM') => {
    setSelectedAcademicTerm(term);
    const termMonths = TERM_MONTHS[term];
    if (!termMonths.includes(currentPeriodMonth)) {
      setCurrentPeriodMonth(termMonths[0]);
    }
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setValue('studentId', sId);
    if (sId && paymentType === 'TUITION') {
      const student = availableStudents.find((st) => st.id === sId);
      if (student) {
        setValue('amountPaid', student.fee || groupFee);
      }
    } else if (sId && paymentType === 'BOOKLET') {
      const currentBooklet = booklets.find((booklet) => booklet.id === selectedBookletId);
      if (currentBooklet && !isBookletEligibleForStudent(currentBooklet, getStudentBookletContext(sId))) {
        setValue('bookletId', '');
        setValue('amountPaid', 0);
      }
    }
  };

  const handleBookletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = e.target.value;
    setValue('bookletId', bId);
    if (bId) {
      const b = booklets.find((item) => item.id === bId);
      if (b) {
        setValue('amountPaid', Number(b.price));
      }
    }
  };

  const handlePaymentTypeChange = (type: 'TUITION' | 'BOOKLET') => {
    setPaymentType(type);
    if (type === 'BOOKLET' && eligibleBooklets.length > 0) {
      setValue('bookletId', eligibleBooklets[0].id);
      setValue('amountPaid', Number(eligibleBooklets[0].price));
    } else if (type === 'TUITION' && selectedStudentId) {
      const student = defaulters.find((d) => d.studentId === selectedStudentId);
      if (student) {
        setValue('amountPaid', student.monthlyFeeExpected);
      }
      setValue('bookletId', undefined);
    }
  };

  if (!isOpen) return null;

  const onSubmit = (data: PaymentFormData) => {
    if (paymentType === 'BOOKLET' && !data.bookletId) {
      toast.error('يرجى اختيار المذكرة المراد سداد قيمتها');
      return;
    }

    const student = defaulters.find((d) => d.studentId === data.studentId);
    const booklet = booklets.find((b) => b.id === data.bookletId);
    const studentContext = getStudentBookletContext(data.studentId);

    if (paymentType === 'BOOKLET' && booklet && !isBookletEligibleForStudent(booklet, studentContext)) {
      toast.error(formatBookletMismatchMessage(booklet.gradeLevel, studentContext.gradeLevel));
      return;
    }

    const expected =
      paymentType === 'BOOKLET'
        ? booklet
          ? Number(booklet.price)
          : data.amountPaid
        : student?.monthlyFeeExpected;

    recordPayment(
      {
        studentId: data.studentId,
        groupId: selectedGroupId || undefined,
        bookletId: paymentType === 'BOOKLET' ? data.bookletId : undefined,
        paymentType,
        periodYear: currentPeriodYear,
        periodMonth: currentPeriodMonth,
        amountPaid: data.amountPaid,
        amountExpected: expected,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'CASH',
        receiptNumber: data.receiptNumber,
        notes:
          data.notes ||
          (paymentType === 'BOOKLET' && booklet ? `سداد مذكرة: ${booklet.title}` : undefined),
      } as any,
      {
        onSuccess: () => {
          toast.success(
            paymentType === 'BOOKLET'
              ? 'تم تسجيل سداد المذكرة بنجاح 📚'
              : 'تم تسجيل سداد المصروفات بنجاح 💳',
          );
          reset();
          onClose();
        },
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء التسجيل'),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {paymentType === 'BOOKLET' ? (
              <BookOpen className="w-5 h-5 text-purple-600" />
            ) : (
              <DollarSign className="w-5 h-5 text-primary" />
            )}
            تسجيل مصروف / سداد
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePaymentTypeChange('TUITION')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                paymentType === 'TUITION'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              اشتراك شهري / حصص
            </button>
            <button
              type="button"
              onClick={() => handlePaymentTypeChange('BOOKLET')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                paymentType === 'BOOKLET'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              سداد قيمة مذكرة
            </button>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-primary-600" />
              <span>تحديد وتصفية المجموعة المستهدفة:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="mb-1 block text-[11px] font-bold text-slate-600">
                  المرحلة الدراسية
                </Label>
                <select
                  className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
                  value={selectedStage}
                  onChange={(e) => handleStageChange(e.target.value)}
                >
                  <option value="">جميع المراحل</option>
                  <option value="SECONDARY">المرحلة الثانوية</option>
                  <option value="PREPARATORY">المرحلة الإعدادية</option>
                  <option value="PRIMARY">المرحلة الابتدائية</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block text-[11px] font-bold text-slate-600">
                  الصف الدراسي
                </Label>
                <select
                  className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
                  value={selectedGradeLevel}
                  onChange={(e) => handleGradeChange(e.target.value)}
                >
                  <option value="">جميع الصفوف</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-1 block text-[11px] font-bold text-slate-600">
                  الفصل والشهر
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    className="w-full h-9 rounded-xl border border-slate-200 px-1.5 text-[11px] font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
                    value={selectedAcademicTerm}
                    onChange={(e) => handleTermChange(e.target.value as 'FIRST_TERM' | 'SECOND_TERM')}
                  >
                    <option value="FIRST_TERM">ترم أول</option>
                    <option value="SECOND_TERM">ترم ثان</option>
                  </select>
                  <select
                    className="w-full h-9 rounded-xl border border-slate-200 px-1.5 text-[11px] font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
                    value={currentPeriodMonth}
                    onChange={(e) => setCurrentPeriodMonth(Number(e.target.value))}
                  >
                    {TERM_MONTHS[selectedAcademicTerm].map((m) => (
                      <option key={m} value={m}>
                        شهر {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-[11px] font-bold text-slate-600">
                  المجموعة الدراسية
                </Label>
                <select
                  className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                >
                  <option value="">-- اختر المجموعة --</option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="block text-xs font-bold text-slate-700">
                  الطالب <span className="text-red-500">*</span>
                </Label>
                {selectedGroupId && (
                  <span className="text-[11px] font-semibold text-primary-600">
                    {availableStudents.length} طالب متاح
                  </span>
                )}
              </div>
              <select
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
                value={selectedStudentId || ''}
                onChange={handleStudentChange}
                disabled={isPending || isDefaultersLoading || isEnrollmentsLoading}
              >
                <option value="">
                  {isDefaultersLoading || isEnrollmentsLoading
                    ? 'جاري تحميل قائمة الطلاب...'
                    : availableStudents.length === 0
                    ? '-- لا يوجد طلاب في هذه المجموعة --'
                    : '-- اختر طالباً --'}
                </option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.studentCode ? `[${s.studentCode}]` : ''} {s.isPaid ? `(مسدد بالفعل — ${s.fee} ج.م)` : `(${s.fee} ج.م — غير مسدد)`}
                  </option>
                ))}
              </select>
              {errors.studentId && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {errors.studentId.message}
                </p>
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
                  onChange={handleBookletChange}
                  disabled={isPending || isBookletsLoading}
                >
                  <option value="">-- اختر المذكرة --</option>
                  {eligibleBooklets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} - {b.gradeLevel} ({b.price} ج.م)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                المبلغ المحصل (ج.م) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                {...register('amountPaid', { valueAsNumber: true })}
                disabled={isPending}
                className="font-bold text-emerald-700"
              />
              {errors.amountPaid && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {errors.amountPaid.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                  رقم الإيصال (اختياري)
                </Label>
                <Input
                  type="text"
                  placeholder="رقم الإيصال الورقي"
                  {...register('receiptNumber')}
                  disabled={isPending}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                  ملاحظات (اختياري)
                </Label>
                <Input
                  type="text"
                  placeholder="...ملاحظات أو خصم"
                  {...register('notes')}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className={
                  paymentType === 'BOOKLET'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                }
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </div>
                ) : (
                  'حفظ عملية السداد'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
