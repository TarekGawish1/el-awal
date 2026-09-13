import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CoursesService, generateBunnyEmbedTicket } from '../services/courses.service';
import { CoursesController } from '../controllers/courses.controller';
import { PrismaService } from '../../../core/database/prisma.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { CourseProgressRepository } from '../repositories/course-progress.repository';
import { AiModerationService } from '../../../integrations/ai/ai-moderation.service';
import { CourseEnrollmentStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('Bunny Stream Secure Token-Signed Video Streaming & Ticket Issuance', () => {
  let controller: CoursesController;
  let service: CoursesService;

  const mockLibraryId = '730290';
  const mockTokenKey = '8b44960b-e9c9-4851-a355-14edf0d4e6e2';

  const mockPrismaService = {
    courseLesson: {
      findUnique: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    courseEnrollment: {
      findUnique: jest.fn(),
    },
  };

  const mockBunnyVideoService = {
    getLibraryId: jest.fn().mockReturnValue(mockLibraryId),
    getTokenSecurityKey: jest.fn().mockReturnValue(mockTokenKey),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.BUNNY_STREAM_LIBRARY_ID = mockLibraryId;
    process.env.BUNNY_STREAM_TOKEN_KEY = mockTokenKey;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BunnyVideoService, useValue: mockBunnyVideoService },
        { provide: StorageService, useValue: {} },
        { provide: CourseProgressRepository, useValue: {} },
        { provide: AiModerationService, useValue: {} },
        Reflector,
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get<CoursesService>(CoursesService);
  });

  describe('generateBunnyEmbedTicket cryptographic function', () => {
    it('generates SHA-256 token matching sha256(securityKey + videoId + expires) spec', () => {
      const videoId = 'test-vid-12345';
      const ttl = 7200;
      const beforeTimestamp = Math.floor(Date.now() / 1000) + ttl;

      const ticket = generateBunnyEmbedTicket(mockLibraryId, videoId, mockTokenKey, ttl);

      expect(ticket.expires).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(ticket.expires).toBeLessThanOrEqual(beforeTimestamp + 2);

      // Verify token formula sha256(securityKey + videoId + expires)
      const expectedHashable = `${mockTokenKey}${videoId}${ticket.expires}`;
      const expectedToken = crypto.createHash('sha256').update(expectedHashable).digest('hex');

      expect(ticket.embedUrl).toBe(
        `https://iframe.mediadelivery.net/embed/${mockLibraryId}/${videoId}?token=${expectedToken}&expires=${ticket.expires}`,
      );
      expect(ticket.embedUrl).toContain(`?token=${expectedToken}`);
      expect(ticket.embedUrl).toContain(`&expires=${ticket.expires}`);
    });
  });

  describe('GET /courses/lessons/:lessonId/stream-ticket authorization & issuance', () => {
    const mockLessonWithEnrolledCourse = {
      id: 'lesson-1',
      title: 'Physics Mechanics Lesson 1',
      bunnyVideoId: 'video-guid-abc-123',
      isPreview: false,
      module: {
        course: {
          id: 'course-1',
          teacherId: 'teacher-1',
          groupAccess: [],
        },
      },
    };

    it('rejects unauthenticated requests without valid JWT (guard level 401)', () => {
      const guard = new JwtAuthGuard(new Reflector());
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException (403) for student who is not enrolled in the course', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLessonWithEnrolledCourse);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-user-1',
        groupEnrollments: [],
      });
      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue(null);

      const unauthorizedStudent: any = {
        id: 'student-user-1',
        role: UserRole.STUDENT,
      };

      await expect(
        controller.getLessonStreamTicket('lesson-1', unauthorizedStudent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns signed embed ticket with 2-hour TTL for actively enrolled student', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLessonWithEnrolledCourse);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-user-1',
        groupEnrollments: [],
      });
      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        status: CourseEnrollmentStatus.ACTIVE,
      });

      const activeStudent: any = {
        id: 'student-user-1',
        role: UserRole.STUDENT,
      };

      const result = await controller.getLessonStreamTicket('lesson-1', activeStudent);

      expect(result).toBeDefined();
      expect(result.embedUrl).toContain(
        `https://iframe.mediadelivery.net/embed/${mockLibraryId}/video-guid-abc-123?token=`,
      );
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Verify cryptographic signature integrity
      const url = new URL(result.embedUrl);
      const token = url.searchParams.get('token');
      const expires = url.searchParams.get('expires');

      expect(token).toBeDefined();
      expect(expires).toBe(String(result.expiresAt));

      const hashable = `${mockTokenKey}video-guid-abc-123${expires}`;
      const expectedToken = crypto.createHash('sha256').update(hashable).digest('hex');
      expect(token).toBe(expectedToken);
    });

    it('returns signed embed ticket for student with parent academic group access', async () => {
      const lessonWithGroupAccess = {
        ...mockLessonWithEnrolledCourse,
        module: {
          course: {
            id: 'course-1',
            groupAccess: [{ groupId: 'group-physics-a' }],
          },
        },
      };

      mockPrismaService.courseLesson.findUnique.mockResolvedValue(lessonWithGroupAccess);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'student-group-user',
        groupEnrollments: [{ groupId: 'group-physics-a' }],
      });
      mockPrismaService.courseEnrollment.findUnique.mockResolvedValue(null);

      const groupStudent: any = {
        id: 'student-group-user',
        role: UserRole.STUDENT,
      };

      const result = await controller.getLessonStreamTicket('lesson-1', groupStudent);

      expect(result.embedUrl).toContain('https://iframe.mediadelivery.net/embed/');
      expect(result.expiresAt).toBeDefined();
    });

    it('grants signed embed ticket to TEACHER and SECRETARIAT bypassing student enrollment checks', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue(mockLessonWithEnrolledCourse);

      const teacherUser: any = {
        id: 'teacher-1',
        role: UserRole.TEACHER,
      };

      const secretariatUser: any = {
        id: 'sec-1',
        role: UserRole.SECRETARIAT,
      };

      const teacherResult = await controller.getLessonStreamTicket('lesson-1', teacherUser);
      const secResult = await controller.getLessonStreamTicket('lesson-1', secretariatUser);

      expect(teacherResult.embedUrl).toContain('https://iframe.mediadelivery.net/embed/');
      expect(secResult.embedUrl).toContain('https://iframe.mediadelivery.net/embed/');
      expect(mockPrismaService.courseEnrollment.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) if lesson has no bunnyVideoId', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue({
        ...mockLessonWithEnrolledCourse,
        bunnyVideoId: null,
      });

      const teacherUser: any = {
        id: 'teacher-1',
        role: UserRole.TEACHER,
      };

      await expect(
        controller.getLessonStreamTicket('lesson-1', teacherUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException (404) if lesson does not exist', async () => {
      mockPrismaService.courseLesson.findUnique.mockResolvedValue(null);

      const teacherUser: any = {
        id: 'teacher-1',
        role: UserRole.TEACHER,
      };

      await expect(
        controller.getLessonStreamTicket('missing-lesson', teacherUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
