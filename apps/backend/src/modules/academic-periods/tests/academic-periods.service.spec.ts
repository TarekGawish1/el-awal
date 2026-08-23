import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AcademicPeriodsService } from '../services/academic-periods.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { TeachersService } from '../../teachers/services/teachers.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

describe('AcademicPeriodsService', () => {
  let service: AcademicPeriodsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockTeachersService = {
    updateAcademicPeriod: jest.fn(),
  };

  const teacherUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    role: UserRole.TEACHER,
    teacherProfileId: 'teacher-profile-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicPeriodsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TeachersService, useValue: mockTeachersService },
      ],
    }).compile();

    service = module.get<AcademicPeriodsService>(AcademicPeriodsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('switchPeriod', () => {
    it('throws UnauthorizedException and does NOT persist when the password is wrong', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword!', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({ passwordHash });

      await expect(
        service.switchPeriod(teacherUser, {
          academicYear: '2027-2028',
          academicTerm: 'SECOND_TERM',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockTeachersService.updateAcademicPeriod).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the account has no stored password hash', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.switchPeriod(teacherUser, {
          academicYear: '2027-2028',
          academicTerm: 'SECOND_TERM',
          password: 'anything',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockTeachersService.updateAcademicPeriod).not.toHaveBeenCalled();
    });

    it('persists the new period via TeachersService when the password is valid', async () => {
      const plainPassword = 'CorrectPassword!';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      mockPrismaService.user.findUnique.mockResolvedValue({ passwordHash });
      mockTeachersService.updateAcademicPeriod.mockResolvedValue({
        activeAcademicYear: '2027-2028',
        activeAcademicTerm: 'SECOND_TERM',
      });

      const result = await service.switchPeriod(teacherUser, {
        academicYear: '2027-2028',
        academicTerm: 'SECOND_TERM',
        password: plainPassword,
      });

      expect(mockTeachersService.updateAcademicPeriod).toHaveBeenCalledWith('teacher-profile-1', {
        activeAcademicYear: '2027-2028',
        activeAcademicTerm: 'SECOND_TERM',
      });
      expect(result).toEqual({
        activeAcademicYear: '2027-2028',
        activeAcademicTerm: 'SECOND_TERM',
      });
    });

    it('falls back to the user id when no teacherProfileId is present', async () => {
      const plainPassword = 'CorrectPassword!';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      mockPrismaService.user.findUnique.mockResolvedValue({ passwordHash });
      mockTeachersService.updateAcademicPeriod.mockResolvedValue({
        activeAcademicYear: '2025-2026',
        activeAcademicTerm: 'FIRST_TERM',
      });

      await service.switchPeriod(
        { id: 'secretariat-1', role: UserRole.SECRETARIAT },
        { academicYear: '2025-2026', academicTerm: 'FIRST_TERM', password: plainPassword },
      );

      expect(mockTeachersService.updateAcademicPeriod).toHaveBeenCalledWith('secretariat-1', {
        activeAcademicYear: '2025-2026',
        activeAcademicTerm: 'FIRST_TERM',
      });
    });
  });
});
