import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentsService } from '../payments.service';

describe('PaymentsService matrix ledger', () => {
  let service: PaymentsService;
  const prisma: any = {
    teacherProfile: { findFirst: jest.fn() },
    teacherBillingConfiguration: { findUnique: jest.fn() },
    studentProfile: { findMany: jest.fn(), count: jest.fn() },
    booklet: { findMany: jest.fn() },
    studentPaymentRecord: { findMany: jest.fn() },
  };

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

  it('calculates monthly and booklet flags and totals for a term', async () => {
    const students = [
      {
        id: 'student-1', studentCode: 'STU-1', gradeLevel: 'الصف الأول الثانوي', user: { fullName: 'أحمد', phone: '010' },
        groupEnrollments: [{ groupId: 'group-1', group: { id: 'group-1', name: 'المجموعة أ', monthlyFee: 300 } }],
      },
      {
        id: 'student-2', studentCode: 'STU-2', gradeLevel: 'الصف الأول الثانوي', user: { fullName: 'سارة', phone: '011' },
        groupEnrollments: [{ groupId: 'group-1', group: { id: 'group-1', name: 'المجموعة أ', monthlyFee: 300 } }],
      },
    ];
    prisma.studentProfile.count.mockResolvedValue(students.length);
    prisma.studentProfile.findMany.mockImplementation(async (args) => students.slice(args.skip || 0, (args.skip || 0) + (args.take || students.length)));
    prisma.booklet.findMany.mockResolvedValue([{ id: 'booklet-1', title: 'مذكرة الفيزياء', price: 50, gradeLevel: 'الصف الأول الثانوي' }]);
    prisma.studentPaymentRecord.findMany.mockResolvedValue([
      { studentId: 'student-1', groupId: 'group-1', bookletId: null, paymentType: 'TUITION', periodYear: 2026, periodMonth: 8, amountExpected: 300, amountPaid: 300, paymentStatus: 'PAID', createdAt: new Date('2026-08-02') },
      { studentId: 'student-1', groupId: 'group-1', bookletId: 'booklet-1', paymentType: 'BOOKLET', periodYear: 2026, periodMonth: 8, amountExpected: 50, amountPaid: 50, paymentStatus: 'PAID', createdAt: new Date('2026-08-03') },
    ]);

    const result = await service.getMatrixLedger(
      { id: 'teacher-user', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
      { academicPeriodId: '2026-2027:FIRST_TERM', stage: 'SECONDARY', gradeLevel: 'الصف الأول الثانوي' },
    );

    expect(result.months).toEqual([8, 9, 10, 11, 12, 1]);
    expect(result.students[0].monthlyPayments[8]).toMatchObject({ isPaid: true, amountPaid: 300 });
    expect(result.students[0].bookletPayments['booklet-1']).toMatchObject({ isPaid: true, amountPaid: 50 });
    expect(result.students[0].totalPaid).toBe(350);
    expect(result.students[0].totalDue).toBe(0);
    expect(result.students[1].monthlyPayments[8].isPaid).toBe(false);
    expect(result.students[1].totalDue).toBe(350);
  });

  it('paginates students and returns only the selected semester months', async () => {
    prisma.studentProfile.count.mockResolvedValue(45);
    prisma.studentProfile.findMany.mockResolvedValue([]);
    prisma.booklet.findMany.mockResolvedValue([]);
    prisma.studentPaymentRecord.findMany.mockResolvedValue([]);

    const result = await service.getMatrixLedger(
      { id: 'teacher-user', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
      { academicYear: '2026-2027', academicTerm: 'SECOND_TERM', page: 2, limit: 20 },
    );

    expect(result.months).toEqual([2, 3, 4, 5, 6, 7]);
    expect(result.totalStudents).toBe(45);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.limit).toBe(20);
    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
  });

  it('does not charge a student for booklets from another grade', async () => {
    const student = {
      id: 'grade-10-student', studentCode: 'STU-10', gradeLevel: 'الصف الأول الثانوي', user: { fullName: 'طالب', phone: '' },
      groupEnrollments: [{ groupId: 'group-1', group: { id: 'group-1', name: 'المجموعة أ', monthlyFee: 300 } }],
    };
    prisma.studentProfile.count.mockResolvedValue(1);
    prisma.studentProfile.findMany.mockResolvedValue([student]);
    prisma.booklet.findMany.mockResolvedValue([
      { id: 'grade-10-booklet', title: 'مذكرة أولى', price: 50, gradeLevel: 'الصف الأول الثانوي' },
      { id: 'grade-12-booklet', title: 'مذكرة ثالثة', price: 100, gradeLevel: 'الصف الثالث الثانوي' },
    ]);
    prisma.studentPaymentRecord.findMany.mockResolvedValue([]);

    const result = await service.getMatrixLedger(
      { id: 'teacher-user', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
      { academicPeriodId: '2026-2027:FIRST_TERM' },
    );

    expect(result.students[0].totalDue).toBe(350);
    expect(result.students[0].bookletPayments['grade-10-booklet']).toMatchObject({ isApplicable: true, isPaid: false });
    expect(result.students[0].bookletPayments['grade-12-booklet']).toEqual({ isApplicable: false, isPaid: false, amountPaid: 0 });
  });
});
