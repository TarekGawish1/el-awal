import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SyncAttendanceBatchDto } from '../dto/sync-attendance.dto';
import { DomainSyncResult } from './sync.service';
import {
  AttendanceStatus,
  RecordingMethod,
  GroupEnrollmentStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class SyncAttendanceService {
  private readonly logger = new Logger(SyncAttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async syncAttendanceBatch(
    user: AuthenticatedUser,
    dto: SyncAttendanceBatchDto,
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

    const MAX_SYNC_BATCH = 500;
    const operations = dto.operations.slice(0, MAX_SYNC_BATCH);
    const recorderId = user.id;

    // Batch Prefetch Optimization: Pre-fetch referenced sessions, students, enrollments, and existing records in bulk
    const sessionIds = Array.from(new Set(operations.map((op) => op.sessionId).filter(Boolean)));
    let sessions: any[] = [];
    try {
      if (sessionIds.length > 0 && typeof this.prisma.lessonSession?.findMany === 'function') {
        const fetched = await this.prisma.lessonSession.findMany({
          where: { id: { in: sessionIds } },
          include: { group: true },
        });
        if (Array.isArray(fetched)) sessions = fetched;
      }
    } catch {
      sessions = [];
    }
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const tokensToLookup = new Set<string>();
    const candidateUuids = new Set<string>();
    for (const op of operations) {
      const sId = op.studentId;
      const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sId || '');
      if (isTargetUuid) {
        candidateUuids.add(sId!);
      }
      const token = (op.qrCodeToken || sId || '').trim();
      if (token) {
        tokensToLookup.add(token);
      }
    }

    const orClauses: any[] = [];
    if (tokensToLookup.size > 0) {
      const tokenArr = Array.from(tokensToLookup);
      orClauses.push({ qrCodeToken: { in: tokenArr } });
      orClauses.push({ studentCode: { in: tokenArr } });
    }
    if (candidateUuids.size > 0) {
      orClauses.push({ id: { in: Array.from(candidateUuids) } });
    }

    let preloadedStudents: any[] = [];
    try {
      if (orClauses.length > 0 && typeof this.prisma.studentProfile?.findMany === 'function') {
        const fetched = await this.prisma.studentProfile.findMany({
          where: { OR: orClauses },
        });
        if (Array.isArray(fetched)) preloadedStudents = fetched;
      }
    } catch {
      preloadedStudents = [];
    }

    const studentTokenMap = new Map<string, any>();
    for (const st of preloadedStudents) {
      if (st.qrCodeToken) studentTokenMap.set(st.qrCodeToken, st);
      if (st.studentCode) studentTokenMap.set(st.studentCode, st);
      studentTokenMap.set(st.id, st);
    }

    const studentIdsFound = preloadedStudents.map((s) => s.id);
    let preloadedEnrollments: any[] = [];
    try {
      if (studentIdsFound.length > 0 && typeof this.prisma.groupEnrollment?.findMany === 'function') {
        const fetched = await this.prisma.groupEnrollment.findMany({
          where: {
            studentId: { in: studentIdsFound },
            status: GroupEnrollmentStatus.ACTIVE,
          },
        });
        if (Array.isArray(fetched)) preloadedEnrollments = fetched;
      }
    } catch {
      preloadedEnrollments = [];
    }

    let preloadedAttendance: any[] = [];
    try {
      if (sessionIds.length > 0 && studentIdsFound.length > 0 && typeof this.prisma.attendanceRecord?.findMany === 'function') {
        const fetched = await this.prisma.attendanceRecord.findMany({
          where: {
            sessionId: { in: sessionIds },
            studentId: { in: studentIdsFound },
          },
          select: { sessionId: true, studentId: true },
        });
        if (Array.isArray(fetched)) preloadedAttendance = fetched;
      }
    } catch {
      preloadedAttendance = [];
    }
    const existingAttendanceSet = new Set(preloadedAttendance.map((a) => `${a.sessionId}:${a.studentId}`));

    for (const op of operations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Verify session existence
          const session =
            sessionMap.get(op.sessionId) ||
            (await tx.lessonSession.findUnique({
              where: { id: op.sessionId },
              include: { group: true },
            }));

          if (!session) {
            throw new NotFoundException(`Session [${op.sessionId}] not found`);
          }

          if (user?.role === UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            if (session.group && session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
              throw new ForbiddenException(
                'FORBIDDEN: You do not own the academic group for this session',
              );
            }
          }

          // 2. Resolve target student
          let resolvedStudentId = op.studentId;
          const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedStudentId || '');
          if ((!resolvedStudentId || !isTargetUuid) && (op.qrCodeToken || resolvedStudentId)) {
            const tokenToLookup = (op.qrCodeToken || resolvedStudentId).trim();
            const isLookupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenToLookup);
            const cachedStudent = studentTokenMap.get(tokenToLookup);
            if (cachedStudent) {
              resolvedStudentId = cachedStudent.id;
            } else if (tx.studentProfile?.findFirst) {
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

          // 3. Verify group enrollment
          if (!op.allowCrossGroup) {
            const enrollment = await tx.groupEnrollment.findUnique({
              where: {
                groupId_studentId: {
                  groupId: session.groupId,
                  studentId: resolvedStudentId,
                },
              },
            });

            if (!enrollment || enrollment.status !== GroupEnrollmentStatus.ACTIVE) {
              result.conflicts.push({
                operationId: op.id,
                reason: `Student [${resolvedStudentId}] is not actively enrolled in group [${session.groupId}]`,
                entityId: resolvedStudentId,
              });
              result.failedCount++;
              return;
            }
          } else {
            // Verify they belong to AT LEAST ONE valid active group (legitimate guest)
            const anyActiveEnrollment = await tx.groupEnrollment.findFirst({
              where: {
                studentId: resolvedStudentId,
                status: GroupEnrollmentStatus.ACTIVE,
              },
            });

            if (!anyActiveEnrollment) {
              result.conflicts.push({
                operationId: op.id,
                reason: `Student [${resolvedStudentId}] has no active group enrollments to qualify for cross-group attendance`,
                entityId: resolvedStudentId,
              });
              result.failedCount++;
              return;
            }
          }

          // 4. Check for duplicate attendance record
          let existingRecord: any = null;
          if (existingAttendanceSet.size > 0 && existingAttendanceSet.has(`${op.sessionId}:${resolvedStudentId}`)) {
            existingRecord = true;
          } else if (tx.attendanceRecord?.findUnique) {
            existingRecord = await tx.attendanceRecord.findUnique({
              where: {
                sessionId_studentId: {
                  sessionId: op.sessionId,
                  studentId: resolvedStudentId,
                },
              },
            });
          }

          if (existingRecord) {
            result.duplicatesIgnored++;
            result.processedOperationIds.push(op.id);
            return;
          }

          // 5. Insert attendance record
          const recordedAtDate = op.clientTimestamp
            ? new Date(op.clientTimestamp)
            : new Date();

          await tx.attendanceRecord.create({
            data: {
              sessionId: op.sessionId,
              studentId: resolvedStudentId,
              status: op.status || AttendanceStatus.PRESENT,
              recordingMethod: op.recordingMethod || RecordingMethod.QR_SCAN,
              recordedById: recorderId,
              recordedAt: recordedAtDate,
              notes: op.notes || 'Synced from offline outbox queue',
            },
          });

          if (op.status === AttendanceStatus.ABSENT && typeof tx.homeworkRecord?.deleteMany === 'function') {
            await tx.homeworkRecord.deleteMany({
              where: {
                sessionId: op.sessionId,
                studentId: resolvedStudentId,
              },
            });
          }

          result.syncedCount++;
          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          result.duplicatesIgnored++;
          result.processedOperationIds.push(op.id);
        } else {
          this.logger.error(`Failed to sync attendance op [${op.id}]:`, err);
          result.failedCount++;
          result.conflicts.push({
            operationId: op.id,
            reason: err?.message || 'Database transaction failure',
          });
        }
      }
    }

    if (result.syncedCount > 0) {
      this.realtimeGateway?.notifyAttendanceChanged([user.id]);
    }

    return result;
  }
}
