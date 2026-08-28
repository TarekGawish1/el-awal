import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentsService } from '../payments.service';

describe('PaymentsService finance analytics', () => {
  let service: PaymentsService;
  const prisma: any = {
    teacherProfile: { findFirst: jest.fn() },
    teacherBillingConfiguration: { findUnique: jest.fn() },
    academicGroup: { findMany: jest.fn() },
    studentProfile: { findMany: jest.fn() },
    booklet: { findMany: jest.fn() },
    studentPaymentRecord: { findMany: jest.fn() },
  };

  const teacherUser = { id: 'teacher-user', teacherProfileId: 'teacher-1', role: UserRole.TEACHER };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PaymentsService);
    jest.clearAllMocks();
    prisma.teacherBillingConfiguration.findUnique.mockResolvedValue(null);
  });

  afterEach(() => jest.useRealTimers());

  const groupsDb = [
    { id: 'group-1', name: 'مجموعة أولى ثانوي', gradeLevel: 'الصف الأول الثانوي', monthlyFee: 300 },
    { id: 'group-2', name: 'مجموعة ثانية ثانوي', gradeLevel: 'الصف الثاني الثانوي', monthlyFee: 200 },
  ];
  const studentsDb = [
    { id: 'student-1', gradeLevel: 'الصف الأول الثانوي', groupEnrollments: [{ groupId: 'group-1' }] },
    { id: 'student-2', gradeLevel: 'الصف الأول الثانوي', groupEnrollments: [{ groupId: 'group-1' }] },
    { id: 'student-3', gradeLevel: 'الصف الثاني الثانوي', groupEnrollments: [{ groupId: 'group-2' }] },
  ];
  const bookletsDb = [
    { id: 'booklet-1', title: 'مذكرة أولى ثانوي', price: 50, gradeLevel: 'الصف الأول الثانوي', groupId: null },
    { id: 'booklet-2', title: 'مذكرة ثانية ثانوي', price: 40, gradeLevel: 'الصف الثاني الثانوي', groupId: null },
  ];
  const paymentsDb = [
    { studentId: 'student-1', groupId: 'group-1', bookletId: null, paymentType: 'TUITION', periodYear: 2026, periodMonth: 8, amountPaid: 300, paymentStatus: 'PAID' },
    { studentId: 'student-1', groupId: 'group-1', bookletId: 'booklet-1', paymentType: 'BOOKLET', periodYear: 2026, periodMonth: 8, amountPaid: 50, paymentStatus: 'PAID' },
    { studentId: 'student-3', groupId: 'group-2', bookletId: null, paymentType: 'TUITION', periodYear: 2026, periodMonth: 9, amountPaid: 100, paymentStatus: 'PAID' },
  ];

  const matchesGrade = (where: any, gradeLevel: string) =>
    where.gradeLevel === gradeLevel || (where.gradeLevel?.in || []).includes(gradeLevel);

  const seedFullScenario = () => {
    prisma.academicGroup.findMany.mockImplementation(async ({ where }: any) =>
      groupsDb.filter((group) => !where.gradeLevel || matchesGrade(where, group.gradeLevel)),
    );
    prisma.studentProfile.findMany.mockImplementation(async ({ where }: any) =>
      studentsDb.filter((student) => !where.gradeLevel || matchesGrade(where, student.gradeLevel)),
    );
    prisma.booklet.findMany.mockImplementation(async ({ where }: any) =>
      bookletsDb.filter((booklet) => !where.gradeLevel || matchesGrade(where, booklet.gradeLevel)),
    );
    prisma.studentPaymentRecord.findMany.mockImplementation(async ({ where }: any) =>
      paymentsDb.filter((payment) => where.studentId.in.includes(payment.studentId)),
    );
  };

  it('aggregates overview tuition, booklets, and overall collection metrics', async () => {
    seedFullScenario();

    const result = await service.getFinanceAnalytics(teacherUser, { academicPeriodId: '2026-2027:FIRST_TERM' });

    expect(result.months).toEqual([8, 9, 10, 11, 12, 1]);
    expect(result.overview.totalStudents).toBe(3);

    expect(result.overview.tuition).toEqual({
      expected: 4800, // (300 * 2 + 200 * 1) * 6 months
      collected: 400,
      remaining: 4400,
      collectionRate: 8.33,
    });

    expect(result.overview.booklets).toEqual({
      expected: 140, // 50 * 2 students + 40 * 1 student
      collected: 50,
      remaining: 90,
      collectionRate: 35.71,
    });

    expect(result.overview.totalExpected).toBe(4940);
    expect(result.overview.totalCollected).toBe(450);
    expect(result.overview.totalRemaining).toBe(4490);
    expect(result.overview.collectionRate).toBe(9.11);
  });

  it('returns per-group tuition, booklets, and total breakdowns', async () => {
    seedFullScenario();

    const result = await service.getFinanceAnalytics(teacherUser, { academicPeriodId: '2026-2027:FIRST_TERM' });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toMatchObject({
      id: 'group-1',
      name: 'مجموعة أولى ثانوي',
      gradeLevel: 'الصف الأول الثانوي',
      stage: 'SECONDARY',
      studentCount: 2,
      tuition: { expected: 3600, collected: 300, remaining: 3300, rate: 8.33 },
      booklets: { expected: 100, collected: 50, remaining: 50, rate: 50 },
      total: { expected: 3700, collected: 350, remaining: 3350, rate: 9.46 },
    });
    expect(result.groups[1]).toMatchObject({
      id: 'group-2',
      studentCount: 1,
      tuition: { expected: 1200, collected: 100, remaining: 1100, rate: 8.33 },
      booklets: { expected: 40, collected: 0, remaining: 40, rate: 0 },
      total: { expected: 1240, collected: 100, remaining: 1140, rate: 8.06 },
    });
  });

  it('scopes groups, students, and booklets when the grade filter is applied', async () => {
    seedFullScenario();

    const result = await service.getFinanceAnalytics(teacherUser, {
      academicPeriodId: '2026-2027:FIRST_TERM',
      gradeLevel: 'الصف الأول الثانوي',
    });

    const expectedWhere = expect.objectContaining({ gradeLevel: 'الصف الأول الثانوي' });
    expect(prisma.academicGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ gradeLevel: 'الصف الأول الثانوي' }) }),
    );
    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(prisma.studentPaymentRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ studentId: { in: ['student-1', 'student-2'] } }) }),
    );
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].id).toBe('group-1');
    expect(result.overview.totalStudents).toBe(2);
  });

  it('translates the stage filter into its grade-level list', async () => {
    seedFullScenario();

    await service.getFinanceAnalytics(teacherUser, { academicPeriodId: '2026-2027:FIRST_TERM', stage: 'SECONDARY' });

    expect(prisma.academicGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gradeLevel: { in: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'] } }),
      }),
    );
  });

  it('excludes billing-configuration months from the tuition expectation', async () => {
    seedFullScenario();
    prisma.teacherBillingConfiguration.findUnique.mockResolvedValue({ excludedMonths: [9, 10, 11, 12, 1] });

    const result = await service.getFinanceAnalytics(teacherUser, { academicPeriodId: '2026-2027:FIRST_TERM' });

    expect(result.months).toEqual([8]);
    expect(result.overview.tuition.expected).toBe(800); // (300 * 2 + 200 * 1) * 1 month
    expect(result.overview.tuition.collected).toBe(400);
    expect(result.overview.tuition.collectionRate).toBe(50);
  });

  it('scopes tuition expected and collected to a single month when periodMonth is provided', async () => {
    seedFullScenario();

    const result = await service.getFinanceAnalytics(teacherUser, {
      academicPeriodId: '2026-2027:FIRST_TERM',
      periodMonth: 9,
    });

    expect(result.scope).toBe('MONTH');
    expect(result.periodMonth).toBe(9);
    expect(result.months).toEqual([9]);

    // Only September tuition counts: expected = (300 * 2 + 200 * 1) * 1 month, collected = student-3's September payment
    expect(result.overview.tuition).toEqual({ expected: 800, collected: 100, remaining: 700, collectionRate: 12.5 });

    // Booklets are a one-time term purchase, so they keep the term-wide scope
    expect(result.overview.booklets).toEqual({ expected: 140, collected: 50, remaining: 90, collectionRate: 35.71 });

    expect(result.overview.totalExpected).toBe(940);
    expect(result.overview.totalCollected).toBe(150);
  });

  it('falls back to term scope when the requested month is outside the term', async () => {
    seedFullScenario();

    const result = await service.getFinanceAnalytics(teacherUser, {
      academicPeriodId: '2026-2027:FIRST_TERM',
      periodMonth: 3, // SECOND_TERM month, not part of FIRST_TERM
    });

    expect(result.scope).toBe('TERM');
    expect(result.periodMonth).toBeNull();
    expect(result.months).toEqual([8, 9, 10, 11, 12, 1]);
    expect(result.overview.tuition.expected).toBe(4800);
  });
});
