import { calculateProratedTuition, isEnrolledInPeriod } from './proration.util';

export interface AvailableStudentItem {
  id: string;
  name: string;
  fee: number;
  amountPaid: number;
  remainingAmount: number;
  isPaid: boolean;
  isPartiallyPaid: boolean;
  studentCode?: string;
  calculationReason?: string;
  rateMultiplier?: number;
}

export function getStudentBookletPaymentStatus(params: {
  studentId: string;
  bookletId?: string;
  matrixLedgerData: any;
  booklets: any[];
}) {
  const { studentId, bookletId, matrixLedgerData, booklets } = params;
  if (!bookletId) return { isPaid: false, isPartiallyPaid: false, amountPaid: 0, remainingAmount: 0, expected: 0 };
  const matrixStudent = matrixLedgerData?.students?.find((s: any) => s.id === studentId);
  const cell = matrixStudent?.bookletPayments?.[bookletId];
  const targetBooklet = booklets.find((b) => b.id === bookletId);
  const expected = Number(cell?.amountExpected || targetBooklet?.price || 0);
  const amountPaid = Number(cell?.amountPaid || 0);
  const isPaid = Boolean(cell?.isPaid || (expected > 0 && amountPaid >= expected));
  const isPartiallyPaid = Boolean(cell?.isPartiallyPaid || (amountPaid > 0 && amountPaid < expected));
  const remainingAmount = isPaid ? 0 : Math.max(0, expected - amountPaid);
  return { isPaid, isPartiallyPaid, amountPaid, remainingAmount, expected };
}

export function buildAvailableStudentsList(params: {
  defaulters: any[];
  groupEnrollments: any[];
  allStudents: any[];
  selectedGroupId: string;
  groupFee: number;
  currentPeriodYear: number;
  currentPeriodMonth: number;
  matrixLedgerData?: any;
}): AvailableStudentItem[] {
  const {
    defaulters,
    groupEnrollments,
    allStudents,
    selectedGroupId,
    groupFee,
    currentPeriodYear,
    currentPeriodMonth,
    matrixLedgerData,
  } = params;

  const map = new Map<string, AvailableStudentItem>();

  defaulters.forEach((d) => {
    const amountPaid = d.amountPaid || 0;
    const fee = d.monthlyFeeExpected !== undefined ? d.monthlyFeeExpected : groupFee;
    const remainingAmount = d.remainingAmount ?? Math.max(0, fee - amountPaid);
    const isPartiallyPaid = Boolean(d.isPartiallyPaid || amountPaid > 0);
    const calculationReason =
      (d as any).calculationReason ||
      (fee < groupFee
        ? fee === 0
          ? 'معفى من اشتراك الشهر الحالي'
          : 'نصف شهر (انضمام منتصف الشهر)'
        : undefined);
    const rateMultiplier = (d as any).rateMultiplier ?? (fee === 0 ? 0 : fee < groupFee ? 0.5 : 1.0);

    map.set(d.studentId, {
      id: d.studentId,
      name: d.fullName,
      fee,
      amountPaid,
      remainingAmount,
      isPaid: false,
      isPartiallyPaid,
      studentCode: d.studentCode || undefined,
      calculationReason,
      rateMultiplier,
    });
  });

  groupEnrollments.forEach((e) => {
    if (e.student?.id && !map.has(e.student.id)) {
      const studentId = e.student.id;
      const enrollmentDate = e.enrolledAt ? new Date(e.enrolledAt) : null;
      let fee = groupFee;
      let calculationReason: string | undefined = undefined;
      let rateMultiplier = 1.0;

      if (enrollmentDate && isEnrolledInPeriod(enrollmentDate, currentPeriodYear, currentPeriodMonth)) {
        const proration = calculateProratedTuition(groupFee, enrollmentDate);
        fee = proration.expectedAmount;
        calculationReason = proration.calculationReason;
        rateMultiplier = proration.rateMultiplier;
      }

      // Check if student has an actual payment record in matrixLedgerData for this month
      const matrixStudent = matrixLedgerData?.students?.find((s: any) => s.id === studentId);
      const tuitionPayment = matrixStudent?.monthlyPayments?.[currentPeriodMonth];

      let isPaid = false;
      let isPartiallyPaid = false;
      let amountPaid = 0;
      let remainingAmount = fee;

      if (tuitionPayment) {
        amountPaid = Number(tuitionPayment.amountPaid || 0);
        isPaid = Boolean(tuitionPayment.isPaid);
        isPartiallyPaid = Boolean(tuitionPayment.isPartiallyPaid);
        remainingAmount = Number(tuitionPayment.remainingAmount ?? Math.max(0, fee - amountPaid));
        if (tuitionPayment.calculationReason) {
          calculationReason = tuitionPayment.calculationReason;
        }
        if (tuitionPayment.rateMultiplier !== undefined) {
          rateMultiplier = tuitionPayment.rateMultiplier;
        }
      } else if (rateMultiplier === 0) {
        isPaid = true;
        amountPaid = 0;
        remainingAmount = 0;
      }

      map.set(studentId, {
        id: studentId,
        name: e.student.user?.name || e.student.user?.fullName || 'طالب',
        fee,
        amountPaid,
        remainingAmount,
        isPaid,
        isPartiallyPaid,
        studentCode: e.student.code || e.student.studentCode,
        calculationReason,
        rateMultiplier,
      });
    }
  });

  if (!selectedGroupId && allStudents.length > 0) {
    allStudents.forEach((s) => {
      if (!map.has(s.id)) {
        const matrixStudent = matrixLedgerData?.students?.find((item: any) => item.id === s.id);
        const tuitionPayment = matrixStudent?.monthlyPayments?.[currentPeriodMonth];

        let isPaid = false;
        let isPartiallyPaid = false;
        let amountPaid = 0;
        let remainingAmount = groupFee;

        if (tuitionPayment) {
          amountPaid = Number(tuitionPayment.amountPaid || 0);
          isPaid = Boolean(tuitionPayment.isPaid);
          isPartiallyPaid = Boolean(tuitionPayment.isPartiallyPaid);
          remainingAmount = Number(tuitionPayment.remainingAmount ?? Math.max(0, groupFee - amountPaid));
        }

        map.set(s.id, {
          id: s.id,
          name: s.fullName,
          fee: groupFee,
          amountPaid,
          remainingAmount,
          isPaid,
          isPartiallyPaid,
          studentCode: s.studentCode,
          rateMultiplier: 1.0,
        });
      }
    });
  }

  return Array.from(map.values());
}

export function resolveStudentBookletContext(params: {
  studentId: string;
  defaulters: any[];
  groupEnrollments: any[];
  allStudents: any[];
  selectedGroupId: string;
  selectedGradeLevel: string;
  allGroups: any[];
}) {
  const {
    studentId,
    defaulters,
    groupEnrollments,
    allStudents,
    selectedGroupId,
    selectedGradeLevel,
    allGroups,
  } = params;

  const defaulter = defaulters.find((student) => student.studentId === studentId);
  const enrollment = groupEnrollments.find((e) => e.student?.id === studentId);
  const fullStudent = allStudents.find((student) => student.id === studentId);

  const groupIds = Array.from(
    new Set([
      selectedGroupId,
      fullStudent?.groupId,
      fullStudent?.initialGroupId,
      ...(fullStudent?.groupIds || []),
    ].filter(Boolean) as string[])
  );

  const gradeLevel =
    enrollment?.student?.gradeLevel ||
    fullStudent?.gradeLevel ||
    defaulter?.gradeLevel ||
    selectedGradeLevel ||
    allGroups.find((g) => g.id === selectedGroupId)?.gradeLevel ||
    '';

  return { gradeLevel, groupIds };
}

export function calculatePaymentAmounts(params: {
  paymentType: 'TUITION' | 'BOOKLET';
  currentBookletStatus: any;
  selectedStudent: any;
  selectedBooklet: any;
  groupFee: number;
  watchAmountPaid: any;
}) {
  const { paymentType, currentBookletStatus, selectedStudent, selectedBooklet, groupFee, watchAmountPaid } = params;

  const isBookletAlreadyPaid = Boolean(currentBookletStatus?.isPaid);

  const previouslyPaid =
    paymentType === 'BOOKLET'
      ? (currentBookletStatus?.amountPaid || 0)
      : (paymentType === 'TUITION' ? (selectedStudent?.amountPaid || 0) : 0);

  const isPreviouslyPartial =
    paymentType === 'BOOKLET'
      ? Boolean(currentBookletStatus?.isPartiallyPaid)
      : (paymentType === 'TUITION' && Boolean(selectedStudent?.isPartiallyPaid || previouslyPaid > 0));

  const currentExpectedAmount =
    paymentType === 'BOOKLET'
      ? Number(currentBookletStatus?.expected || selectedBooklet?.price || 0)
      : Number(selectedStudent?.fee || groupFee || 0);

  const currentEnteredAmount = Number(watchAmountPaid || 0);
  const totalCumulativePaid = previouslyPaid + currentEnteredAmount;
  const remainingDue = Math.max(0, currentExpectedAmount - totalCumulativePaid);
  const isFullPayment = totalCumulativePaid >= currentExpectedAmount && currentExpectedAmount > 0;
  const isPartialPayment = totalCumulativePaid > 0 && totalCumulativePaid < currentExpectedAmount;

  return {
    isBookletAlreadyPaid,
    previouslyPaid,
    isPreviouslyPartial,
    currentExpectedAmount,
    currentEnteredAmount,
    totalCumulativePaid,
    remainingDue,
    isFullPayment,
    isPartialPayment,
  };
}

export function buildPaymentPayloadAndNotes(params: {
  data: any;
  paymentType: 'TUITION' | 'BOOKLET';
  availableStudents: any[];
  booklets: any[];
  studentContext: any;
  selectedGroupId?: string;
  currentPeriodYear: number;
  currentPeriodMonth: number;
  groupFee: number;
}) {
  const {
    data,
    paymentType,
    availableStudents,
    booklets,
    studentContext,
    selectedGroupId,
    currentPeriodYear,
    currentPeriodMonth,
    groupFee,
  } = params;
  const student = availableStudents.find((d) => d.id === data.studentId);
  const booklet = booklets.find((b) => b.id === data.bookletId);

  const expected =
    paymentType === 'BOOKLET'
      ? booklet
        ? Number(booklet.price)
        : data.amountPaid
      : (student?.fee !== undefined ? student.fee : (groupFee || data.amountPaid));

  const studentPrevPaid = paymentType === 'TUITION' ? (student?.amountPaid || 0) : 0;
  const currentInstallment = Number(data.amountPaid || 0);
  const cumulativeTotal = studentPrevPaid + currentInstallment;

  const isFull = cumulativeTotal >= expected;
  const remaining = Math.max(0, expected - cumulativeTotal);

  const payload = {
    studentId: data.studentId,
    groupId: selectedGroupId || undefined,
    bookletId: paymentType === 'BOOKLET' ? data.bookletId : undefined,
    paymentType,
    periodYear: currentPeriodYear,
    periodMonth: currentPeriodMonth,
    amountPaid: cumulativeTotal,
    amountExpected: expected,
    paymentStatus: isFull ? 'PAID' : 'PENDING',
    paymentMethod: 'CASH',
    receiptNumber: data.receiptNumber,
    notes:
      data.notes ||
      (paymentType === 'BOOKLET' && booklet
        ? `سداد مذكرة ${booklet.title}${remaining > 0 ? ` (متبقي ${remaining} ج.م)` : ''}`
        : isFull
        ? 'سداد كامل المصروفات'
        : `سداد جزء من المصروفات (متبقي ${remaining} ج.م)`),
  };

  return { payload, isFull, currentInstallment };
}

export function getInitialTuitionAmount(student: any, groupFee: number) {
  if (!student) return groupFee;
  return student.isPartiallyPaid
    ? (student.remainingAmount ?? Math.max(0, (student.fee || groupFee) - (student.amountPaid || 0)))
    : (student.fee || groupFee);
}

export function getInitialBookletAmount(status: any, price: number) {
  return status.isPartiallyPaid ? status.remainingAmount : (status.isPaid ? 0 : price);
}



