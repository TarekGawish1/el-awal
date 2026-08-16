import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus } from '@prisma/client';

export interface QrScanInputDto {
  sessionId: string;
  qrCodeToken: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceRepository: AttendanceRepository,
  ) {}

  /**
   * 7-Tier Verification Pipeline for QR Code Roll-call
   */
  async processQrScan(dto: QrScanInputDto, recordedById: string) {
    // 1. Session Verification
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: dto.sessionId },
      include: { group: true },
    });
    if (!session) {
      throw new NotFoundException(`Lesson session [${dto.sessionId}] not found`);
    }

    // 2. Token Resolution
    const student = await this.prisma.studentProfile.findUnique({
      where: { qrCodeToken: dto.qrCodeToken },
      include: { user: { select: { fullName: true, isActive: true } } },
    });
    if (!student || !student.user.isActive) {
      throw new BadRequestException('Invalid QR credential or inactive student');
    }

    // 3. Cohort Enrollment Check
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: {
        groupId_studentId: {
          groupId: session.groupId,
          studentId: student.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Student ${student.user.fullName} is not actively enrolled in group ${session.group.name}`,
      );
    }

    // 4. Atomic Record Creation
    const result = await this.attendanceRepository.recordQrScan(
      session.id,
      student.id,
      recordedById,
    );

    return {
      ...result,
      student: {
        id: student.id,
        fullName: student.user.fullName,
        studentCode: student.studentCode,
      },
      session: {
        id: session.id,
        date: session.sessionDate,
        groupName: session.group.name,
      },
    };
  }

  async getStudentHistory(studentId: string, pagination: CursorPaginationDto, status?: AttendanceStatus) {
    return this.attendanceRepository.getStudentAttendanceHistory(
      studentId,
      {
        cursor: pagination.cursor,
        limit: pagination.limit,
        direction: pagination.direction,
      },
      status,
    );
  }
}
