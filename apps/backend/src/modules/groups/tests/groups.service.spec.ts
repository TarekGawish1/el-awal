import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { GroupsService } from '../services/groups.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    academicGroup: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    groupEnrollment: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lessonSession: {
      count: jest.fn(),
    },
    attendanceRecord: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getGroupById (Ownership Enforcement)', () => {
    const groupId = 'group-1';
    const teacher1Id = 'teacher-1';
    const teacher2Id = 'teacher-2';

    const mockGroup = {
      id: groupId,
      name: 'مجموعة الثانوية العامة أ',
      teacherId: teacher1Id,
      maxCapacity: 50,
      schedules: [],
      _count: { enrollments: 10, sessions: 4 },
    };

    it('should allow the owner teacher to access their group', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      const teacher1User: any = {
        id: teacher1Id,
        teacherProfileId: teacher1Id,
        role: UserRole.TEACHER,
      };

      const result = await service.getGroupById(groupId, teacher1User);
      expect(result.id).toBe(groupId);
    });

    it('should throw ForbiddenException if another teacher attempts to access the group', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      const teacher2User: any = {
        id: teacher2Id,
        teacherProfileId: teacher2Id,
        role: UserRole.TEACHER,
      };

      await expect(service.getGroupById(groupId, teacher2User)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow SECRETARIAT role to access any group without ownership check', async () => {
      mockPrismaService.academicGroup.findUnique.mockResolvedValue(mockGroup);

      const secretariatUser: any = {
        id: 'sec-1',
        secretariatProfileId: 'sec-1',
        role: UserRole.SECRETARIAT,
      };

      const result = await service.getGroupById(groupId, secretariatUser);
      expect(result.id).toBe(groupId);
    });
  });
});
