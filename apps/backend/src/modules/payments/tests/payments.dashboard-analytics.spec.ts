import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseEnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentsService } from '../payments.service';

describe('PaymentsService getDashboardAnalytics', () => {
  let service: PaymentsService;
  const prisma: any = {
    teacherProfile: { findFirst: jest.fn() },
    teacherBillingConfiguration: { findUnique: jest.fn() },
    academicGroup: { findMany: jest.fn() },
    studentProfile: { findMany: jest.fn() },
    booklet: { findMany: jest.fn() },
    studentPaymentRecord: { findMany: jest.fn() },
    course: { findMany: jest.fn() },
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

  it('aggregates subscriptions, booklets, and online courses accurately', async () => {
    const groupsDb = [
      { id: 'group-1', name: 'Group 1', gradeLevel: 'الصف الأول الثانوي', monthlyFee: 300 },
      { id: 'group-2', name: 'Group 2', gradeLevel: 'الصف الثاني الثانوي', monthlyFee: 200 },
    ];

    const studentsDb = [
      {
        id: 'student-1',
        gradeLevel: 'الصف الأول الثانوي',
        groupEnrollments: [{ groupId: 'group-1', enrolledAt: new Date('2026-08-01') }],
      },
      {
        id: 'student-2',
        gradeLevel: 'الصف الأول الثانوي',
        groupEnrollments: [{ groupId: 'group-1', enrolledAt: new Date('2026-08-01') }],
      },
      {
        id: 'student-3',
        gradeLevel: 'الصف الثاني الثانوي',
        groupEnrollments: [{ groupId: 'group-2', enrolledAt: new Date('2026-08-01') }],
      },
    ];

    const bookletsDb = [
      { id: 'booklet-1', title: 'Booklet 1', price: 50, gradeLevel: 'الصف الأول الثانوي', groupId: null },
      { id: 'booklet-2', title: 'Booklet 2', price: 40, gradeLevel: 'الصف الثاني الثانوي', groupId: null },
    ];

    const paymentsDb = [
      // student-1 paid tuition 300
      {
        studentId: 'student-1',
        groupId: 'group-1',
        bookletId: null,
        paymentType: 'TUITION',
        periodYear: 2026,
        periodMonth: 8,
        amountPaid: 300,
        paymentStatus: 'PAID',
      },
      // student-1 paid booklet 50
      {
        studentId: 'student-1',
        groupId: 'group-1',
        bookletId: 'booklet-1',
        paymentType: 'BOOKLET',
        periodYear: 2026,
        periodMonth: 8,
        amountPaid: 50,
        paymentStatus: 'PAID',
      },
    ];

    const coursesDb = [
      {
        id: 'course-1',
        title: 'Physics Online',
        price: 150,
        gradeLevel: 'الصف الأول الثانوي',
        enrollments: [
          { status: CourseEnrollmentStatus.ACTIVE, transferAmount: 150, enrolledAt: new Date('2026-08-05') },
          { status: CourseEnrollmentStatus.PENDING, transferAmount: 150, enrolledAt: new Date('2026-08-10') },
        ],
      },
    ];

    prisma.academicGroup.findMany.mockResolvedValue(groupsDb);
    prisma.studentProfile.findMany.mockResolvedValue(studentsDb);
    prisma.booklet.findMany.mockResolvedValue(bookletsDb);
    prisma.studentPaymentRecord.findMany.mockResolvedValue(paymentsDb);
    prisma.course.findMany.mockResolvedValue(coursesDb);

    const result = await service.getDashboardAnalytics(teacherUser, { month: '8' });

    // Verify overview structure
    expect(result.overview).toBeDefined();
    expect(result.overview.subscriptions).toBeDefined();
    expect(result.overview.booklets).toBeDefined();
    expect(result.overview.onlineCourses).toBeDefined();
    expect(result.overview.grandTotal).toBeDefined();

    // Group 1: 2 students * 300 = 600. Group 2: 1 student * 200 = 200. Total tuition expected = 800
    expect(result.overview.subscriptions.expected).toBe(800);
    expect(result.overview.subscriptions.collected).toBe(300);
    expect(result.overview.subscriptions.remaining).toBe(500);
    expect(result.overview.subscriptions.rate).toBeCloseTo((300 / 800) * 100);

    // Booklets: Group 1 has 2 students * 50 = 100. Group 2 has 1 student * 40 = 40. Total expected = 140
    expect(result.overview.booklets.expected).toBe(140);
    expect(result.overview.booklets.collected).toBe(50);
    expect(result.overview.booklets.remaining).toBe(90);

    // Online Courses: 1 active (150) + 1 pending (150) = 300 expected, 150 collected
    expect(result.overview.onlineCourses.expected).toBe(300);
    expect(result.overview.onlineCourses.collected).toBe(150);
    expect(result.overview.onlineCourses.remaining).toBe(150);
    expect(result.overview.onlineCourses.rate).toBe(50);

    // Grand total: expected = 800 + 140 + 300 = 1240, collected = 300 + 50 + 150 = 500
    expect(result.overview.grandTotal.expected).toBe(1240);
    expect(result.overview.grandTotal.collected).toBe(500);
    expect(result.overview.grandTotal.remaining).toBe(740);

    // Verify groups breakdown
    expect(result.groups).toHaveLength(2);
    const g1 = result.groups.find((g) => g.id === 'group-1');
    expect(g1).toBeDefined();
    expect(g1?.studentCount).toBe(2);
    expect(g1?.subscription.expected).toBe(600);
    expect(g1?.subscription.collected).toBe(300);
    expect(g1?.booklets.expected).toBe(100);
    expect(g1?.booklets.collected).toBe(50);

    // Verify online courses breakdown
    expect(result.onlineCourses).toHaveLength(1);
    expect(result.onlineCourses[0].id).toBe('course-1');
    expect(result.onlineCourses[0].enrolledStudents).toBe(1);
    expect(result.onlineCourses[0].totalCollected).toBe(150);
  });
});
