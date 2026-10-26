import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';

describe('UsersService - getProfile Sensitive Field Sanitization', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      notification: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('excludes sensitive fields (passwordHash, tempAccessPin, pendingCredentials) from profile response', async () => {
    const rawUserRecord = {
      id: 'user-stu-1',
      fullName: 'علي محمود',
      phone: '+201000000099',
      email: 'student@elawal.com',
      role: UserRole.STUDENT,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      teacherProfile: null,
      studentProfile: {
        id: 'stu-prof-1',
        studentCode: 'STD-1001',
        gradeLevel: 'GRADE_10',
        academicStage: 'SECONDARY',
        academicStatus: 'ACTIVE',
        attendanceMode: 'CENTER',
        dateOfBirth: null,
        emergencyPhone: '+201100000099',
        qrCodeToken: 'qr-token-safe',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      parentProfile: null,
      secretariatProfile: null,
      assistantToTeachers: [],
    };

    mockPrisma.user.findUnique.mockResolvedValue(rawUserRecord);

    const profile: any = await service.getProfile('user-stu-1');

    expect(profile.passwordHash).toBeUndefined();
    expect(profile.studentProfile.tempAccessPin).toBeUndefined();
    expect(profile.studentProfile.pendingCredentials).toBeUndefined();
    expect(profile.studentProfile.pinExpiresAt).toBeUndefined();
    expect(profile.studentProfile.id).toBe('stu-prof-1');
    expect(profile.studentProfile.studentCode).toBe('STD-1001');

    const selectArgs = mockPrisma.user.findUnique.mock.calls[0][0].select;
    expect(selectArgs.passwordHash).toBeUndefined();
    expect(selectArgs.studentProfile).toEqual(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          studentCode: true,
        }),
      }),
    );
  });
});
