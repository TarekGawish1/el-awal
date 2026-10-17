'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRecordPayment, useGroupDefaulters, useMatrixLedger } from './useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { useGroups, useGroupStudents } from '@/features/groups/hooks/useGroups';
import { GRADE_LEVELS_BY_STAGE, inferStageFromGrade } from '@/lib/constants/grades';
import { TERM_MONTHS } from '../components/FinanceFiltersBar';
import { PaymentStatus } from '../types/finance.types';
import toast from 'react-hot-toast';
import { formatBookletMismatchMessage, isBookletEligibleForStudent } from '../utils/bookletEligibility';
import { matchesSearch } from '@/lib/utils/search';
import {
  buildAvailableStudentsList,
  getStudentBookletPaymentStatus as getBookletStatus,
  resolveStudentBookletContext,
  calculatePaymentAmounts,
  buildPaymentPayloadAndNotes,
  getInitialTuitionAmount,
  getInitialBookletAmount,
} from '../utils/paymentModalHelpers';

import {
  paymentSchema,
  type PaymentFormData,
} from '../types/paymentModal.types';

export { paymentSchema };
export type { PaymentFormData };

interface UseRecordPaymentModalStateProps {
  initialGroupId?: string;
  initialPeriodYear: number;
  initialPeriodMonth: number;
  allStudents?: Array<{
    id: string;
    fullName: string;
    studentCode?: string;
    gradeLevel: string;
    groupId?: string;
    initialGroupId?: string;
    groupIds?: string[];
  }>;
  onClose: () => void;
}

export function useRecordPaymentModalState({
  initialGroupId = '',
  initialPeriodYear,
  initialPeriodMonth,
  allStudents = [],
  onClose,
}: UseRecordPaymentModalStateProps) {
  const [paymentType, setPaymentType] = useState<'TUITION' | 'BOOKLET'>('TUITION');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId);
  const [selectedAcademicTerm, setSelectedAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>('FIRST_TERM');
  const [currentPeriodYear, setCurrentPeriodYear] = useState<number>(initialPeriodYear);
  const [currentPeriodMonth, setCurrentPeriodMonth] = useState<number>(initialPeriodMonth);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(true);

  const { data: allGroups = [] } = useGroups();

  const availableGrades = useMemo(() => {
    if (selectedStage && GRADE_LEVELS_BY_STAGE[selectedStage as keyof typeof GRADE_LEVELS_BY_STAGE]) {
      return GRADE_LEVELS_BY_STAGE[selectedStage as keyof typeof GRADE_LEVELS_BY_STAGE];
    }
    return Array.from(new Set(allGroups.map((g) => g.gradeLevel).filter(Boolean)));
  }, [selectedStage, allGroups]);

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
    currentPeriodMonth
  );
  const { data: groupEnrollments = [], isLoading: isEnrollmentsLoading } = useGroupStudents(selectedGroupId);
  const { booklets = [], isLoading: isBookletsLoading } = useBooklets();
  const { data: matrixLedgerData } = useMatrixLedger({
    groupId: selectedGroupId || undefined,
    stage: selectedStage || undefined,
    gradeLevel: selectedGradeLevel || undefined,
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = form;

  const selectedStudentId = watch('studentId');
  const selectedBookletId = watch('bookletId');
  const defaulters = defaultersData?.defaulters || [];
  const currentGroupObj = allGroups.find((g) => g.id === selectedGroupId);
  const groupFee = Number(currentGroupObj?.monthlyFee) || 0;

  const getStudentBookletPaymentStatus = (studentId: string, bookletId?: string) => {
    return getBookletStatus({ studentId, bookletId, matrixLedgerData, booklets });
  };

  const availableStudents = useMemo(() => {
    return buildAvailableStudentsList({
      defaulters,
      groupEnrollments,
      allStudents,
      selectedGroupId,
      groupFee,
      currentPeriodYear,
      currentPeriodMonth,
    });
  }, [defaulters, groupEnrollments, selectedGroupId, allStudents, groupFee, currentPeriodYear, currentPeriodMonth]);

  const filteredStudents = useMemo(() => {
    return availableStudents.filter((s) => {
      if (paymentType === 'TUITION' && showOnlyUnpaid && s.isPaid) {
        return false;
      }
      if (paymentType === 'BOOKLET' && showOnlyUnpaid && selectedBookletId) {
        const bookletStatus = getStudentBookletPaymentStatus(s.id, selectedBookletId);
        if (bookletStatus.isPaid) {
          return false;
        }
      }
      if (!studentSearchQuery.trim()) return true;
      return (
        matchesSearch(s.name, studentSearchQuery) ||
        (s.studentCode ? s.studentCode.toLowerCase().includes(studentSearchQuery.toLowerCase().trim()) : false)
      );
    });
  }, [availableStudents, showOnlyUnpaid, paymentType, selectedBookletId, matrixLedgerData, studentSearchQuery]);

  const getStudentBookletContext = (studentId: string) => {
    return resolveStudentBookletContext({
      studentId,
      defaulters,
      groupEnrollments,
      allStudents,
      selectedGroupId,
      selectedGradeLevel,
      allGroups,
    });
  };

  const eligibleBooklets = useMemo(() => {
    if (selectedStudentId) {
      const student = getStudentBookletContext(selectedStudentId);
      const studentBooklets = booklets.filter((booklet) => isBookletEligibleForStudent(booklet, student));
      if (studentBooklets.length > 0) return studentBooklets;
    }

    return booklets.filter((booklet) => {
      if (selectedGroupId && booklet.groupId && booklet.groupId !== selectedGroupId) return false;
      if (selectedGradeLevel && booklet.gradeLevel !== selectedGradeLevel) return false;
      if (selectedStage && inferStageFromGrade(booklet.gradeLevel) !== selectedStage) return false;
      return true;
    });
  }, [booklets, selectedStudentId, selectedGroupId, selectedGradeLevel, selectedStage, defaulters, groupEnrollments, allStudents]);

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
      if (g?.gradeLevel) {
        setSelectedGradeLevel(g.gradeLevel);
        const st = inferStageFromGrade(g.gradeLevel);
        if (st) setSelectedStage(st);
      }
    }
  };

  const handleTermChange = (term: 'FIRST_TERM' | 'SECOND_TERM') => {
    setSelectedAcademicTerm(term);
    const termMonths = TERM_MONTHS[term];
    if (!termMonths.includes(currentPeriodMonth)) setCurrentPeriodMonth(termMonths[0]);
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setValue('studentId', sId);
    if (sId && paymentType === 'TUITION') {
      setValue('amountPaid', getInitialTuitionAmount(availableStudents.find((st) => st.id === sId), groupFee));
    } else if (sId && paymentType === 'BOOKLET') {
      const bId = selectedBookletId || (eligibleBooklets.length > 0 ? eligibleBooklets[0].id : undefined);
      if (bId) {
        if (!selectedBookletId) setValue('bookletId', bId);
        const status = getStudentBookletPaymentStatus(sId, bId);
        const price = Number(booklets.find((booklet) => booklet.id === bId)?.price || 0);
        setValue('amountPaid', getInitialBookletAmount(status, price));
      }
    }
  };

  const handleBookletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = e.target.value;
    setValue('bookletId', bId);
    if (bId) {
      const price = Number(booklets.find((item) => item.id === bId)?.price || 0);
      const status = selectedStudentId ? getStudentBookletPaymentStatus(selectedStudentId, bId) : null;
      setValue('amountPaid', status ? getInitialBookletAmount(status, price) : price);
    }
  };

  const handlePaymentTypeChange = (type: 'TUITION' | 'BOOKLET') => {
    setPaymentType(type);
    if (type === 'BOOKLET') {
      const bId = selectedBookletId || (eligibleBooklets.length > 0 ? eligibleBooklets[0].id : undefined);
      if (bId) {
        setValue('bookletId', bId);
        const price = Number(booklets.find((booklet) => booklet.id === bId)?.price || 0);
        const status = selectedStudentId ? getStudentBookletPaymentStatus(selectedStudentId, bId) : null;
        setValue('amountPaid', status ? getInitialBookletAmount(status, price) : price);
      }
    } else if (type === 'TUITION' && selectedStudentId) {
      setValue('amountPaid', getInitialTuitionAmount(availableStudents.find((d) => d.id === selectedStudentId), groupFee));
      setValue('bookletId', undefined);
    }
  };

  const watchAmountPaid = watch('amountPaid');
  const selectedStudent = availableStudents.find((s) => s.id === selectedStudentId);
  const selectedBooklet = booklets.find((b) => b.id === selectedBookletId);

  const currentBookletStatus = useMemo(() => {
    if (paymentType !== 'BOOKLET' || !selectedStudentId || !selectedBookletId) {
      return null;
    }
    return getStudentBookletPaymentStatus(selectedStudentId, selectedBookletId);
  }, [paymentType, selectedStudentId, selectedBookletId, matrixLedgerData, booklets]);

  const {
    isBookletAlreadyPaid,
    previouslyPaid,
    isPreviouslyPartial,
    currentExpectedAmount,
    currentEnteredAmount,
    totalCumulativePaid,
    remainingDue,
    isFullPayment,
    isPartialPayment,
  } = calculatePaymentAmounts({
    paymentType,
    currentBookletStatus,
    selectedStudent,
    selectedBooklet,
    groupFee,
    watchAmountPaid,
  });

  const onSubmit = (data: PaymentFormData) => {
    if (paymentType === 'BOOKLET' && !data.bookletId) {
      toast.error('يرجى اختيار المذكرة المراد سداد قيمتها');
      return;
    }

    const booklet = booklets.find((b) => b.id === data.bookletId);
    const studentContext = getStudentBookletContext(data.studentId);

    if (paymentType === 'BOOKLET' && booklet && !isBookletEligibleForStudent(booklet, studentContext)) {
      toast.error(formatBookletMismatchMessage(booklet.gradeLevel, studentContext.gradeLevel));
      return;
    }

    const { payload, isFull, currentInstallment } = buildPaymentPayloadAndNotes({
      data,
      paymentType,
      availableStudents,
      booklets,
      studentContext,
      selectedGroupId,
      currentPeriodYear,
      currentPeriodMonth,
      groupFee,
    });

    recordPayment(
      payload as any,
      {
        onSuccess: () => {
          toast.success(
            paymentType === 'BOOKLET'
              ? isFull
                ? 'تم سداد قيمة المذكرة بالكامل بنجاح'
                : `تم تسجيل سداد جزء من قيمة المذكرة (${currentInstallment} ج.م) بنجاح`
              : isFull
              ? 'تم تسجيل سداد المصروفات بالكامل بنجاح'
              : `تم تسجيل سداد جزء من المصروفات (${currentInstallment} ج.م) بنجاح`
          );
          reset();
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || err?.message || 'فشل في تسجيل السداد');
        },
      }
    );
  };

  return {
    paymentType,
    selectedStage,
    selectedGradeLevel,
    selectedGroupId,
    selectedAcademicTerm,
    currentPeriodYear,
    currentPeriodMonth,
    studentSearchQuery,
    setStudentSearchQuery,
    showOnlyUnpaid,
    setShowOnlyUnpaid,
    availableGrades,
    filteredGroups,
    availableStudents,
    filteredStudents,
    eligibleBooklets,
    booklets,
    isPending,
    isDefaultersLoading,
    isEnrollmentsLoading,
    isBookletsLoading,
    groupFee,
    register,
    handleSubmit,
    errors,
    setValue,
    selectedStudentId,
    selectedBookletId,
    selectedStudent,
    selectedBooklet,
    getStudentBookletPaymentStatus,
    currentBookletStatus,
    isBookletAlreadyPaid,
    previouslyPaid,
    isPreviouslyPartial,
    currentExpectedAmount,
    currentEnteredAmount,
    totalCumulativePaid,
    remainingDue,
    isFullPayment,
    isPartialPayment,
    handleStageChange,
    handleGradeChange,
    handleGroupChange,
    handleTermChange,
    handleStudentChange,
    handleBookletChange,
    handlePaymentTypeChange,
    setCurrentPeriodYear,
    setCurrentPeriodMonth,
    onSubmit,
  };
}
