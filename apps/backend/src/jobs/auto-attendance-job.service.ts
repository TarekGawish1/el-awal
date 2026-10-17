import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus } from '@prisma/client';
import { getSessionUtcDate } from './scheduler-timezone.util';

@Injectable()
export class AutoAttendanceJobService {
  private readonly logger = new Logger(AutoAttendanceJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-Attendance: Runs daily at 23:00 (Africa/Cairo).
   * Marks unrecorded students from recent past sessions as PRESENT.
   */
  async runAutoAttendancePresent(): Promise<void> {
    this.logger.log('📋 [AutoAttendance] Starting auto-present marking job...');

    try {
      const now = new Date();
      const cutoffStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          isCancelled: false,
          sessionDate: {
            gte: cutoffStart,
            lte: now,
          },
        },
        include: {
          group: {
            include: {
              teacher: {
                include: {
                  user: { select: { id: true } },
                },
              },
              enrollments: {
                where: { status: GroupEnrollmentStatus.ACTIVE },
                select: { studentId: true, enrolledAt: true },
              },
            },
          },
          attendanceRecords: {
            select: { studentId: true },
          },
        },
      });

      let totalMarked = 0;

      const allRecordsToCreate: Array<{
        sessionId: string;
        studentId: string;
        status: AttendanceStatus;
        recordingMethod: RecordingMethod;
        recordedById: string;
        notes: string;
        recordedAt: Date;
      }> = [];

      for (const session of sessions) {
        const teacherUserId = session.group.teacher?.user?.id;
        if (!teacherUserId) continue;

        const alreadyRecordedIds = new Set(
          session.attendanceRecords.map((r) => r.studentId),
        );

        const sessionEndTime = session.endTime
          ? getSessionUtcDate(session.sessionDate, session.endTime)
          : new Date(session.sessionDate);

        const studentsToMark = session.group.enrollments
          .filter((e) => {
            if (!e.enrolledAt) return true;
            return new Date(e.enrolledAt).getTime() <= sessionEndTime.getTime();
          })
          .map((e) => e.studentId)
          .filter((id) => !alreadyRecordedIds.has(id));

        for (const studentId of studentsToMark) {
          allRecordsToCreate.push({
            sessionId: session.id,
            studentId,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById: teacherUserId,
            notes: 'تسجيل تلقائي — لم يُسجَّل غياب',
            recordedAt: new Date(),
          });
        }
      }

      if (allRecordsToCreate.length > 0) {
        await this.prisma.attendanceRecord.createMany({
          data: allRecordsToCreate,
          skipDuplicates: true,
        });
      }

      totalMarked = allRecordsToCreate.length;

      this.logger.log(
        `✅ [AutoAttendance] Done. Processed ${sessions.length} session(s), auto-marked ${totalMarked} student attendance record(s) as PRESENT.`,
      );
    } catch (err: any) {
      this.logger.error(`❌ [AutoAttendance] Job failed: ${err.message}`, err.stack);
    }
  }
}
