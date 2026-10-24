import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { SyncStudentsService } from '../services/sync-students.service';
import { StudentProfileService } from '../../students/services/student-profile.service';
import { CourseRegistrationService } from '../../courses/services/course-registration.service';
import { CourseCoreService } from '../../courses/services/course-core.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import { SyncAttendanceService } from '../services/sync-attendance.service';
import { SyncPaymentsService } from '../services/sync-payments.service';
import { SyncAssessmentsService } from '../services/sync-assessments.service';
import { SyncHomeworkService } from '../services/sync-homework.service';
import { SyncMutationsService } from '../services/sync-mutations.service';
import { UserRole } from '@prisma/client';

describe('SEC-14: Removal of Hardcoded Default Passwords Regression Tests', () => {
  describe('1. SyncStudentsService — Student and Parent Provisioning', () => {
    let service: SyncStudentsService;
    let createdUserData: any = null;
    let createdStudentProfileData: any = null;
    let createdParentUserData: any = null;

    const mockTx = {
      teacherProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'teacher-1', userId: 'teacher-1' }),
      },
      teacherAssistant: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      academicGroup: {
        findUnique: jest.fn().mockResolvedValue({ id: 'group-1', teacherId: 'teacher-1' }),
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.phone === '01012345678') return null; // student not existing
          if (where.phone === '01098765432') return null; // parent not existing
          return null;
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          if (data.role === UserRole.STUDENT) {
            createdUserData = data;
            return { id: 'stu-user-1', ...data };
          }
          if (data.role === UserRole.PARENT) {
            createdParentUserData = data;
            return { id: 'parent-user-1', ...data, parentProfile: { id: 'parent-user-1' } };
          }
          return { id: 'generic-user', ...data };
        }),
      },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => {
          createdStudentProfileData = data;
          return { id: data.id, ...data };
        }),
      },
      parentStudentLink: {
        create: jest.fn().mockResolvedValue({}),
      },
      courseEnrollment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      groupEnrollment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockTx)),
    };

    beforeEach(async () => {
      createdUserData = null;
      createdStudentProfileData = null;
      createdParentUserData = null;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SyncStudentsService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: CoursesService, useValue: {} },
          { provide: SyncAttendanceService, useValue: {} },
          { provide: SyncPaymentsService, useValue: {} },
          { provide: SyncAssessmentsService, useValue: {} },
          { provide: SyncHomeworkService, useValue: {} },
          { provide: SyncMutationsService, useValue: {} },
        ],
      }).compile();

      service = module.get<SyncStudentsService>(SyncStudentsService);
    });

    it('provisions a student without password: does NOT use Password123! and sets temporary PIN', async () => {
      await service.syncUnifiedBatch(
        { id: 'teacher-1', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
        {
          groups: [],
          students: [
            {
              type: 'CREATE_STUDENT',
              clientTempId: 'temp-1',
              fullName: 'أحمد محمود',
              phone: '01012345678',
              gradeLevel: 'GRADE_10',
              academicStage: 'SECONDARY',
              parentPhone: '01098765432',
              parentName: 'محمود حسن',
              groupId: 'group-1',
            },
          ],
          payments: [],
        },
      );

      expect(createdUserData).toBeDefined();
      expect(createdStudentProfileData).toBeDefined();

      // SEC-14 Core Verification: Password123! must NOT match the generated hash
      const matchesDefaultStudent = await bcrypt.compare('Password123!', createdUserData.passwordHash);
      expect(matchesDefaultStudent).toBe(false);

      // Verify that a high-entropy tempAccessPin was issued with 48h expiration
      expect(createdStudentProfileData.tempAccessPin).toBeDefined();
      expect(createdStudentProfileData.tempAccessPin).not.toBe('Password123!');
      expect(typeof createdStudentProfileData.tempAccessPin).toBe('string');
      expect(createdStudentProfileData.tempAccessPin.length).toBeGreaterThanOrEqual(6);
      expect(new Date(createdStudentProfileData.pinExpiresAt).getTime()).toBeGreaterThan(Date.now());

      // The temporary PIN must match the hash
      const matchesTempPin = await bcrypt.compare(
        createdStudentProfileData.tempAccessPin,
        createdUserData.passwordHash,
      );
      expect(matchesTempPin).toBe(true);

      // Parent user verification: Parent123! must NOT match parent's hash
      expect(createdParentUserData).toBeDefined();
      const matchesDefaultParent = await bcrypt.compare('Parent123!', createdParentUserData.passwordHash);
      expect(matchesDefaultParent).toBe(false);
    });

    it('provisions a student WITH an explicit password: hashes the provided password and does not set tempAccessPin', async () => {
      await service.syncUnifiedBatch(
        { id: 'teacher-1', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
        {
          groups: [],
          students: [
            {
              type: 'CREATE_STUDENT',
              clientTempId: 'temp-2',
              fullName: 'خالد علي',
              phone: '01099887766',
              gradeLevel: 'GRADE_10',
              academicStage: 'SECONDARY',
              password: 'MyCustomStudentPass2026!',
              groupId: 'group-1',
            },
          ],
          payments: [],
        },
      );

      expect(createdUserData).toBeDefined();
      const matchesCustom = await bcrypt.compare('MyCustomStudentPass2026!', createdUserData.passwordHash);
      expect(matchesCustom).toBe(true);

      const matchesDefault = await bcrypt.compare('Password123!', createdUserData.passwordHash);
      expect(matchesDefault).toBe(false);

      expect(createdStudentProfileData.tempAccessPin).toBeNull();
      expect(createdStudentProfileData.pinExpiresAt).toBeNull();
    });
  });

  describe('2. StudentProfileService — Parent Creation', () => {
    let profileService: StudentProfileService;
    let createdParentData: any = null;

    const mockPrismaService = {
      groupEnrollment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'enr-1' }),
      },
      studentProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'stu-1',
          user: { fullName: 'طالب اختباري' },
          parentLinks: [], // No existing parent
          groupEnrollments: [{ id: 'enr-1', groupId: 'group-1', status: 'ACTIVE' }],
        }),
      },
      user: {
        create: jest.fn().mockImplementation(({ data }) => {
          createdParentData = data;
          return { id: 'parent-id-1', ...data };
        }),
      },
      parentStudentLink: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
    };

    beforeEach(async () => {
      createdParentData = null;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StudentProfileService,
          { provide: PrismaService, useValue: mockPrismaService },
        ],
      }).compile();

      profileService = module.get<StudentProfileService>(StudentProfileService);
    });

    it('does NOT assign Parent123! when adding a new parent phone in student profile update', async () => {
      await profileService.updateStudent(
        'stu-1',
        {
          parentPhone: '01011223344',
          parentName: 'ولي الأمر الجديد',
          parentRelationship: 'أب',
        },
        { id: 'teacher-1', teacherProfileId: 'teacher-1', role: UserRole.TEACHER },
      );

      expect(createdParentData).toBeDefined();
      expect(createdParentData.role).toBe(UserRole.PARENT);

      // Parent123! must NOT match
      const matchesParentDefault = await bcrypt.compare('Parent123!', createdParentData.passwordHash);
      expect(matchesParentDefault).toBe(false);
    });
  });

  describe('3. CourseRegistrationService — Self-Registration Credential Entropy', () => {
    let registrationService: CourseRegistrationService;
    let createdUserData: any = null;
    let createdProfileData: any = null;

    const mockPrisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'course-1',
          teacherId: 'teacher-1',
          title: 'دورة النحو',
          gradeLevel: 'GRADE_10',
          academicStage: 'SECONDARY',
          price: 100,
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => {
          createdUserData = data;
          createdProfileData = data.studentProfile?.create;
          return { id: 'user-c-1', ...data, studentProfile: { id: 'user-c-1', ...createdProfileData } };
        }),
      },
      studentProfile: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      courseEnrollment: {
        create: jest.fn().mockResolvedValue({ id: 'enr-c-1' }),
        upsert: jest.fn().mockResolvedValue({ id: 'enr-c-1' }),
      },
      courseAccess: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    beforeEach(async () => {
      createdUserData = null;
      createdProfileData = null;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CourseRegistrationService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: CourseCoreService, useValue: { clearCatalogCache: jest.fn().mockResolvedValue(undefined) } },
        ],
      }).compile();

      registrationService = module.get<CourseRegistrationService>(CourseRegistrationService);
    });

    it('generates high-entropy credential (not Password123! or Parent123!) during course self-registration', async () => {
      await registrationService.createAndEnrollStudent(
        'course-1',
        'teacher-1',
        false,
        {
          fullName: 'طالب دورة',
          phone: '01022334455',
          parentPhone: '01066778899',
          gradeLevel: 'GRADE_10',
        },
      );

      expect(createdUserData).toBeDefined();
      expect(createdProfileData).toBeDefined();

      const matchesStudentDefault = await bcrypt.compare('Password123!', createdUserData.passwordHash);
      expect(matchesStudentDefault).toBe(false);

      const matchesParentDefault = await bcrypt.compare('Parent123!', createdUserData.passwordHash);
      expect(matchesParentDefault).toBe(false);

      expect(createdProfileData.tempAccessPin).toBeDefined();
      expect(createdProfileData.tempAccessPin.length).toBeGreaterThanOrEqual(8);
      expect(new Date(createdProfileData.pinExpiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
