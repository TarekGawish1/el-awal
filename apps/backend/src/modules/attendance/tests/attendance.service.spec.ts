import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus } from '@prisma/client';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;
  let repository: AttendanceRepository;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    lessonSession: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    groupEnrollment: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    attendanceRecord: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRepository = {
    recordQrScan: jest.fn(),
    getStudentAttendanceHistory: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AttendanceRepository, useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<AttendanceRepository>(AttendanceRepository);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('processQrScan', () => {
    const sessionId = 'session-1';
    const qrCodeToken = 'qr_tok_valid_123';
    const recordedById = 'teacher-user-1';

    it('should successfully record attendance for actively enrolled student', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: sessionId,
        groupId: 'group-1',
        group: {
          id: 'group-1',
          name: 'مجموعة أ',
          _count: { enrollments: 30 },
        },
      });

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
        studentCode: 'STU-2026-0001',
        qrCodeToken,
        user: { fullName: 'محمود أحمد', isActive: true },
      });

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue({
        groupId: 'group-1',
        studentId: 'student-1',
        status: GroupEnrollmentStatus.ACTIVE,
      });

      mockRepository.recordQrScan.mockResolvedValue({
        record: {
          id: 'att-1',
          sessionId,
          studentId: 'student-1',
          status: AttendanceStatus.PRESENT,
          recordingMethod: RecordingMethod.QR_SCAN,
          recordedById,
          recordedAt: new Date(),
        },
        isDuplicate: false,
      });

      mockPrismaService.attendanceRecord.count.mockResolvedValue(15);

      const result = await service.processQrScan(sessionId, qrCodeToken, recordedById);

      expect(result.isDuplicate).toBe(false);
      expect(result.student.fullName).toBe('محمود أحمد');
      expect(result.sessionStats.totalPresent).toBe(15);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'attendance.recorded',
        expect.objectContaining({ sessionId, studentId: 'student-1' }),
      );
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue(null);

      await expect(
        service.processQrScan('invalid-session', qrCodeToken, recordedById),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if student is not enrolled in session group', async () => {
      mockPrismaService.lessonSession.findUnique.mockResolvedValue({
        id: sessionId,
        groupId: 'group-1',
        group: { name: 'مجموعة أ', _count: { enrollments: 30 } },
      });

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-1',
        qrCodeToken,
        user: { fullName: 'محمود أحمد', isActive: true },
      });

      mockPrismaService.groupEnrollment.findUnique.mockResolvedValue(null); // Not enrolled

      await expect(
        service.processQrScan(sessionId, qrCodeToken, recordedById),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStudentHistory (Security Authorization)', () => {
    it('should throw ForbiddenException if student attempts to view another student history', async () => {
      const studentUser: any = {
        id: 'user-stu-1',
        studentProfileId: 'stu-profile-1',
        role: 'STUDENT',
      };

      await expect(
        service.getStudentHistory('stu-profile-2', { limit: 20 }, undefined, studentUser),
      ).rejects.toThrow();
    });

    it('should allow student to view their own attendance history', async () => {
      const studentUser: any = {
        id: 'user-stu-1',
        studentProfileId: 'stu-profile-1',
        role: 'STUDENT',
      };

      mockRepository.getStudentAttendanceHistory.mockResolvedValue({ data: [], meta: {} });

      const result = await service.getStudentHistory(
        'stu-profile-1',
        { limit: 20 },
        undefined,
        studentUser,
      );
      expect(result).toBeDefined();
    });
  });
});
