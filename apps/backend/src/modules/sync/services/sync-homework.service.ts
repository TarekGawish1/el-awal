import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SyncHomeworkBatchDto } from '../dto/sync-homework.dto';
import { DomainSyncResult } from './sync.service';
import {
  AssessmentType,
  HomeworkSubmissionStatus,
  HomeworkDeliveryType,
  AttendanceStatus,
  RecordingMethod,
  GroupEnrollmentStatus,
} from '@prisma/client';

@Injectable()
export class SyncHomeworkService {
  private readonly logger = new Logger(SyncHomeworkService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async syncHomeworkBatch(
    user: AuthenticatedUser,
    dto: SyncHomeworkBatchDto,
  ): Promise<DomainSyncResult> {
    const result: DomainSyncResult = {
      syncedCount: 0,
      duplicatesIgnored: 0,
      failedCount: 0,
      processedOperationIds: [],
      conflicts: [],
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    const recorderId = user.id;

    for (const op of dto.operations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Verify session existence
          const session = await tx.lessonSession.findUnique({
            where: { id: op.sessionId },
          });

          if (!session) {
            throw new NotFoundException(`Session [${op.sessionId}] not found`);
          }

          let assessment: any = null;
          const isPlaceholder =
            !op.assessmentId ||
            op.assessmentId === 'default-session-homework' ||
            op.assessmentId === 'default';
          if (!isPlaceholder && typeof tx.assessment?.findUnique === 'function') {
            try {
              assessment = await tx.assessment.findUnique({
                where: { id: op.assessmentId.trim() },
              });
            } catch {}
          }

          // If not found or dummy id, try to find an existing homework assessment for this group
          if (!assessment && session.groupId && typeof tx.assessment?.findFirst === 'function') {
            try {
              assessment = await tx.assessment.findFirst({
                where: {
                  groupId: session.groupId,
                  type: AssessmentType.ASSIGNMENT,
                },
                orderBy: { createdAt: 'desc' },
              });
            } catch {}
          }

          // If still no assessment exists, auto-provision a session homework assessment
          if (!assessment && session.groupId && typeof tx.assessment?.create === 'function') {
            const group =
              typeof tx.academicGroup?.findUnique === 'function'
                ? await tx.academicGroup.findUnique({
                    where: { id: session.groupId },
                    select: { teacherId: true, gradeLevel: true, name: true },
                  })
                : null;
            if (group) {
              const formattedDate =
                session.sessionDate instanceof Date
                  ? session.sessionDate.toISOString().slice(0, 10)
                  : String(session.sessionDate).slice(0, 10);
              assessment = await tx.assessment.create({
                data: {
                  title: session.topic ? `واجب: ${session.topic}` : `واجب حصة ${formattedDate}`,
                  type: AssessmentType.ASSIGNMENT,
                  teacherId: group.teacherId,
                  groupId: session.groupId,
                  gradeLevel: group.gradeLevel,
                  homeworkDeliveryType: HomeworkDeliveryType.ONSITE,
                  totalScore: 10.0,
                  isPublished: true,
                },
              });
            }
          }

          if (!assessment) {
            result.conflicts.push({
              operationId: op.id,
              reason: `Unable to associate homework with an assessment for session [${op.sessionId}]`,
            });
            result.failedCount++;
            return;
          }

          const targetAssessmentId = assessment.id;

          // 3. Resolve target student
          let resolvedStudentId = op.studentId;
          const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedStudentId || '');
          if ((!resolvedStudentId || !isTargetUuid) && (op.qrCodeToken || resolvedStudentId)) {
            const tokenToLookup = (op.qrCodeToken || resolvedStudentId).trim();
            const isLookupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenToLookup);
            if (tx.studentProfile?.findFirst) {
              const student = await tx.studentProfile.findFirst({
                where: {
                  OR: [
                    { qrCodeToken: tokenToLookup },
                    { studentCode: tokenToLookup },
                    ...(isLookupUuid ? [{ id: tokenToLookup }] : []),
                  ],
                },
              });
              if (student) {
                resolvedStudentId = student.id;
              }
            }
          }

          if (!resolvedStudentId) {
            result.conflicts.push({
              operationId: op.id,
              reason: 'Student could not be resolved from token or ID',
            });
            result.failedCount++;
            return;
          }

          const studentValidation = await tx.studentProfile.findFirst({
            where: { id: resolvedStudentId },
            include: { user: { select: { isActive: true } } },
          });

          if (!studentValidation || !studentValidation.user?.isActive) {
            result.conflicts.push({
              operationId: op.id,
              reason: 'STUDENT_INACTIVE_OR_NOT_FOUND',
            });
            result.failedCount++;
            return;
          }

          // 3.5 Verify Group Enrollment (Defense in Depth)
          const isEnrolled = await tx.groupEnrollment.findUnique({
            where: {
              groupId_studentId: {
                groupId: session.groupId,
                studentId: resolvedStudentId,
              },
            },
          });

          if (!isEnrolled || isEnrolled.status !== GroupEnrollmentStatus.ACTIVE) {
            // Check if they were admitted as a cross-group guest (attendance record exists)
            const guestAttendance = await tx.attendanceRecord.findUnique({
              where: {
                sessionId_studentId: {
                  sessionId: op.sessionId,
                  studentId: resolvedStudentId,
                },
              },
            });

            if (!guestAttendance) {
              result.conflicts.push({
                operationId: op.id,
                reason: `Student [${resolvedStudentId}] is not enrolled in session group [${session.groupId}] and has no guest attendance record`,
                entityId: resolvedStudentId,
              });
              result.failedCount++;
              return;
            }
          }

          const clientDate = op.clientTimestamp ? new Date(op.clientTimestamp) : new Date();

          // 4. Upsert Homework Record
          let existingHomework: any = null;
          if (typeof tx.homeworkRecord?.findFirst === 'function') {
            existingHomework = await tx.homeworkRecord.findFirst({
              where: {
                sessionId: op.sessionId,
                studentId: resolvedStudentId,
              },
            });
          } else if (typeof tx.homeworkRecord?.findUnique === 'function') {
            existingHomework = await tx.homeworkRecord.findUnique({
              where: {
                assessmentId_studentId_sessionId: {
                  assessmentId: targetAssessmentId,
                  studentId: resolvedStudentId,
                  sessionId: op.sessionId,
                },
              },
            });
          }

          if (existingHomework) {
            await tx.homeworkRecord.update({
              where: { id: existingHomework.id },
              data: {
                assessmentId: targetAssessmentId,
                status: op.status || HomeworkSubmissionStatus.CHECKED_ONSITE,
                recordedMethod: op.recordedMethod || RecordingMethod.QR_SCAN,
                score: op.score !== undefined ? op.score : existingHomework.score,
                feedback: op.feedback !== undefined ? op.feedback : existingHomework.feedback,
                updatedAt: clientDate,
              },
            });
            result.duplicatesIgnored++;
          } else {
            await tx.homeworkRecord.create({
              data: {
                assessmentId: targetAssessmentId,
                studentId: resolvedStudentId,
                sessionId: op.sessionId,
                status: op.status || HomeworkSubmissionStatus.CHECKED_ONSITE,
                checkedByRole: user.role,
                recordedMethod: op.recordedMethod || RecordingMethod.QR_SCAN,
                score: op.score,
                feedback: op.feedback,
                clientTimestamp: clientDate,
                createdAt: clientDate,
                updatedAt: clientDate,
              },
            });
            result.syncedCount++;
          }

          await tx.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: op.sessionId,
                studentId: resolvedStudentId,
              },
            },
            update: {
              status: AttendanceStatus.PRESENT,
              recordingMethod: op.recordedMethod || RecordingMethod.QR_SCAN,
              recordedAt: clientDate,
            },
            create: {
              sessionId: op.sessionId,
              studentId: resolvedStudentId,
              status: AttendanceStatus.PRESENT,
              recordingMethod: op.recordedMethod || RecordingMethod.QR_SCAN,
              recordedById: recorderId,
              recordedAt: clientDate,
            },
          });

          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to process homework operation [${op.id}]: ${err.message}`,
          err.stack,
        );
        result.failedCount++;
        result.conflicts.push({
          operationId: op.id,
          reason: err?.message || 'Database transaction failure',
        });
      }
    }

    if (result.syncedCount > 0) {
      this.realtimeGateway?.notifyAttendanceChanged([user.id]);
    }

    return result;
  }
}
