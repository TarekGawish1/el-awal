import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentsService } from '../payments.service';

describe('PaymentsService matrix ledger', () => {
  let service: PaymentsService;
  const prisma = {
    teacherProfile: { findFirst: jest.fn() },
    studentProfile: { findMany: jest.fn() },
    booklet: { findMany: jest.fn() },
    studentPaymentRecord: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PaymentsService);
    jest.clearAllMocks();
  });

  it('calculates monthly and booklet flags and totals for a term', async () => {
    prisma.studentProfile.findMany.mockResolvedValue([
      {
        id: 'student-1', studentCode: 'STU-1', gradeLevel: 'الصف الأول الثانوي', user: { fullName: 'أحمد', phone: '010' },
        groupEnrollments: [{ groupId: 'group-1', group: { id: 'group-1', name: 'المجموعة أ', monthlyFee: 300 } }],
      },
      {
        id: 'student-2', studentCode: 'STU-2', gradeLevel: 'الصف الأول الثانوي', user: { fullName: 'سارة', phone: '011' },
        groupEnrollments: [{ groupId: 'group-1', group: { id: 'group-1', name: 'المجموعة أ', monthlyFee: 300 } }],
      },
    ]);
    prisma.booklet.findMany.mockResolvedValue([{ id: 'booklet-1', title: 'مذكرة الفيزياء', price: 50, gradeLevel: 'الصف الأول الثانوي' }]);
    prisma.studentPaymentRecord.findMany.mockResolvedValue([
      { studentId: 'student-1', groupId: 'group-1', bookletId: null, paymentType: 'TUITION', periodYear: 2026, periodMonth: 8, amountExpected: 300, amountPaid: 300, paymentStatus: 'PAID', createdAt: new Date('2026-08-02') },
      { studentId: 'student-1', groupId: 'group-1', bookletId: 'booklet-1', paymentType: 'BOOKLET', periodYear: 2026, periodMonth: 8, amountExpected: 50, amountPaid: 50, paymentStatus: 'PAID', createdAt: new Date('2026-08-03') },
    ]);

    const result = await service.getMatrixLedger(
      { id: 'teacher-user', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
      { academicPeriodId: '2026-2027:FIRST_TERM', gradeLevel: 'الصف الأول الثانوي' },
    );

    expect(result.months).toEqual([8, 9, 10, 11, 12, 1]);
    expect(result.students[0].monthlyPayments[8]).toMatchObject({ isPaid: true, amountPaid: 300 });
    expect(result.students[0].bookletPayments['booklet-1']).toMatchObject({ isPaid: true, amountPaid: 50 });
    expect(result.students[0].totalPaid).toBe(350);
    expect(result.students[0].totalDue).toBe(1500);
    expect(result.students[1].monthlyPayments[8].isPaid).toBe(false);
    expect(result.students[1].totalDue).toBe(1850);
  });
});
