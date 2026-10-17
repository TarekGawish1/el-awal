import { PaymentType } from '@prisma/client';
import { round2, rate } from './payment-billing-config.service';
import { isPeriodBeforeEnrollment, isEnrolledInPeriod, calculateProratedTuition } from '../../subscriptions/utils/proration.util';

export interface GroupFinancialMetricsParams {
  groups: any[];
  students: any[];
  booklets: any[];
  payments: any[];
  billingMonths: number[];
  isMonthScope: boolean;
  requestedMonth: number;
  academicYear: string;
  useSubscriptionKey?: boolean;
  inferStage: (gradeLevel: string) => string;
}

export function calculateGroupFinancialMetrics(params: GroupFinancialMetricsParams) {
  const {
    groups,
    students,
    booklets,
    payments,
    billingMonths,
    isMonthScope,
    requestedMonth,
    academicYear,
    useSubscriptionKey = false,
    inferStage,
  } = params;

  const groupIds = new Set(groups.map((group) => group.id));
  const primaryGroupByStudent = new Map<string, string | null>();
  const studentCountByGroup = new Map<string, number>();
  const studentCountByGrade = new Map<string, number>();
  const tuitionExpectedByGroup = new Map<string, number>();
  const startYear = parseInt(academicYear.split('-')[0], 10) || new Date().getFullYear();

  for (const student of students) {
    const enrollmentGroupIds = student.groupEnrollments.map((enrollment: any) => enrollment.groupId);
    primaryGroupByStudent.set(student.id, enrollmentGroupIds[0] || null);
    studentCountByGrade.set(student.gradeLevel, (studentCountByGrade.get(student.gradeLevel) || 0) + 1);

    for (const enrollment of student.groupEnrollments) {
      const groupId = enrollment.groupId;
      studentCountByGroup.set(groupId, (studentCountByGroup.get(groupId) || 0) + 1);

      const group = groups.find((g) => g.id === groupId);
      if (group) {
        const groupFee = Number(group.monthlyFee);
        let studentExpected = 0;
        const enrollmentDate = new Date(enrollment.enrolledAt);

        for (const m of billingMonths) {
          const mYear = m >= 8 ? startYear : startYear + 1;
          if (enrollment.enrolledAt && isPeriodBeforeEnrollment(enrollmentDate, mYear, m)) {
            continue;
          }

          const isJoiningMonth = Boolean(enrollment.enrolledAt && isEnrolledInPeriod(enrollmentDate, mYear, m));
          const fee = isJoiningMonth
            ? calculateProratedTuition(groupFee, enrollmentDate).expectedAmount
            : groupFee;
          studentExpected += fee;
        }
        tuitionExpectedByGroup.set(groupId, (tuitionExpectedByGroup.get(groupId) || 0) + studentExpected);
      }
    }
  }

  const tuitionCollectedByGroup = new Map<string, number>();
  const bookletCollectedByGroup = new Map<string, number>();
  for (const payment of payments) {
    const attributedGroupId =
      payment.groupId && groupIds.has(payment.groupId)
        ? payment.groupId
        : primaryGroupByStudent.get(payment.studentId) || null;
    if (!attributedGroupId || !groupIds.has(attributedGroupId)) continue;
    if (isMonthScope && payment.paymentType === PaymentType.TUITION && Number(payment.periodMonth) !== requestedMonth) continue;
    const target = payment.paymentType === PaymentType.BOOKLET ? bookletCollectedByGroup : tuitionCollectedByGroup;
    target.set(attributedGroupId, (target.get(attributedGroupId) || 0) + Number(payment.amountPaid || 0));
  }

  const groupRows = groups.map((group) => {
    const studentCount = studentCountByGroup.get(group.id) || 0;
    const tuitionExpected = round2(tuitionExpectedByGroup.get(group.id) || 0);
    const bookletsExpected = round2(
      booklets
        .filter((booklet) => booklet.gradeLevel === group.gradeLevel && (!booklet.groupId || booklet.groupId === group.id))
        .reduce((sum, booklet) => sum + Number(booklet.price) * studentCount, 0),
    );
    const tuitionCollected = round2(tuitionCollectedByGroup.get(group.id) || 0);
    const bookletsCollected = round2(bookletCollectedByGroup.get(group.id) || 0);
    const totalExpected = round2(tuitionExpected + bookletsExpected);
    const totalCollected = round2(tuitionCollected + bookletsCollected);

    const tuitionMetrics = {
      expected: tuitionExpected,
      collected: tuitionCollected,
      remaining: Math.max(0, round2(tuitionExpected - tuitionCollected)),
      rate: rate(tuitionCollected, tuitionExpected),
    };

    const bookletsMetrics = {
      expected: bookletsExpected,
      collected: bookletsCollected,
      remaining: Math.max(0, round2(bookletsExpected - bookletsCollected)),
      rate: rate(bookletsCollected, bookletsExpected),
    };

    const totalMetrics = {
      expected: totalExpected,
      collected: totalCollected,
      remaining: Math.max(0, round2(totalExpected - totalCollected)),
      rate: rate(totalCollected, totalExpected),
    };

    const row: any = {
      id: group.id,
      name: group.name,
      gradeLevel: group.gradeLevel,
      stage: inferStage(group.gradeLevel),
      studentCount,
      booklets: bookletsMetrics,
      total: totalMetrics,
    };

    if (useSubscriptionKey) {
      row.subscription = tuitionMetrics;
    } else {
      row.tuition = tuitionMetrics;
    }

    return row;
  });

  const overviewTuitionExpected = round2(
    groupRows.reduce((sum: number, group: any) => sum + (useSubscriptionKey ? group.subscription.expected : group.tuition.expected), 0)
  );
  const overviewTuitionCollected = round2(
    groupRows.reduce((sum: number, group: any) => sum + (useSubscriptionKey ? group.subscription.collected : group.tuition.collected), 0)
  );
  const overviewBookletsExpected = round2(
    booklets.reduce(
      (sum, booklet) =>
        sum +
        Number(booklet.price) *
          (booklet.groupId ? studentCountByGroup.get(booklet.groupId) || 0 : studentCountByGrade.get(booklet.gradeLevel) || 0),
      0,
    )
  );
  const overviewBookletsCollected = round2(groupRows.reduce((sum: number, group: any) => sum + group.booklets.collected, 0));

  return {
    groupRows,
    studentCountByGroup,
    studentCountByGrade,
    overviewTuitionExpected,
    overviewTuitionCollected,
    overviewBookletsExpected,
    overviewBookletsCollected,
    overviewTotalExpected: round2(overviewTuitionExpected + overviewBookletsExpected),
    overviewTotalCollected: round2(overviewTuitionCollected + overviewBookletsCollected),
  };
}
