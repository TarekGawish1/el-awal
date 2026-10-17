import { Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SyncMutationItemDto } from '../dto/sync-batch.dto';
import {
  GroupEnrollmentStatus,
  UserRole,
  AssessmentType,
  HomeworkDeliveryType,
  HomeworkSubmissionStatus,
  RecordingMethod,
  AttendanceStatus,
} from '@prisma/client';

export async function handleHomeworkOnsiteMutation(
  mutation: SyncMutationItemDto,
  user: AuthenticatedUser,
  prisma: PrismaService,
  sessionMap: Map<string, any>,
  studentMap: Map<string, any>,
  logger: Logger,
): Promise<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }> {
  let { studentId } = mutation.payload || {};
  const {
    assessmentId,
    sessionId,
    status,
    recordedMethod,
    score,
    feedback,
    clientTimestamp,
    qrCodeToken,
    allowCrossGroup,
  } = mutation.payload || {};

  let targetStudentId = studentId;
  const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetStudentId || '');

  if ((!targetStudentId || !isTargetUuid) && (qrCodeToken || targetStudentId)) {
    const lookupToken = (qrCodeToken || targetStudentId).trim();
    const isLookupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupToken);
    let student = studentMap.get(lookupToken);
    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: {
          OR: [
            { qrCodeToken: lookupToken },
            { studentCode: lookupToken },
            ...(isLookupUuid ? [{ id: lookupToken }] : []),
          ],
          user: { isActive: true },
        },
        include: { groupEnrollments: true },
      });
      if (student) studentMap.set(lookupToken, student);
    }

    if (!student) {
      return { mutationId: mutation.id, status: 'FAILED', error: 'INVALID_QR_CODE' };
    }
    targetStudentId = student.id;
  }

  if (!targetStudentId || !sessionId) {
    throw new BadRequestException(
      `Missing required parameters for RECORD_HOMEWORK_ONSITE in mutation ${mutation.id}`,
    );
  }

  if (user?.role === UserRole.STUDENT || user?.role === UserRole.PARENT) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'UNAUTHORIZED_ROLE' };
  }

  let session = sessionMap.get(sessionId);
  if (!session) {
    session = await prisma.lessonSession.findUnique({
      where: { id: sessionId },
      select: {
        groupId: true,
        group: {
          select: { teacherId: true },
        },
      },
    });
    if (session) sessionMap.set(sessionId, session);
  }

  if (!session) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'SESSION_NOT_FOUND' };
  }

  if (user?.role === UserRole.TEACHER) {
    const teacherId = user.teacherProfileId || user.id;
    if (session.group?.teacherId && session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
      return { mutationId: mutation.id, status: 'FAILED', error: 'FORBIDDEN_GROUP_ACCESS' };
    }
  }

  let studentData = studentMap.get(targetStudentId);
  if (!studentData) {
    studentData = await prisma.studentProfile.findFirst({
      where: { id: targetStudentId },
      include: {
        user: { select: { isActive: true } },
        groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
      },
    });
    if (studentData) studentMap.set(targetStudentId, studentData);
  }

  if (!studentData || !studentData.user.isActive) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_INACTIVE_OR_NOT_FOUND' };
  }

  const directEnrollment = studentData.groupEnrollments.some((e: any) => e.groupId === session.groupId);
  if (!directEnrollment && !allowCrossGroup) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_NOT_ENROLLED' };
  }

  studentId = targetStudentId;

  const isPlaceholder =
    !assessmentId ||
    assessmentId === 'default-session-homework' ||
    assessmentId === 'default';
  let targetAssessmentId = !isPlaceholder ? assessmentId : undefined;
  if (!targetAssessmentId) {
    try {
      const sessionWithHomework = await prisma.lessonSession.findUnique({
        where: { id: sessionId },
        include: {
          homeworkRecords: { take: 1 },
          group: {
            include: {
              assessments: {
                where: { type: AssessmentType.ASSIGNMENT },
                take: 1,
              },
            },
          },
        },
      });
      targetAssessmentId =
        sessionWithHomework?.group?.assessments?.[0]?.id ||
        sessionWithHomework?.homeworkRecords?.[0]?.assessmentId;

      if (!targetAssessmentId && sessionWithHomework?.groupId) {
        const fallbackAssessment = await prisma.assessment.findFirst({
          where: {
            groupId: sessionWithHomework.groupId,
            type: AssessmentType.ASSIGNMENT,
          },
          orderBy: { createdAt: 'desc' },
        });
        targetAssessmentId = fallbackAssessment?.id;
      }

      if (!targetAssessmentId && sessionWithHomework?.groupId) {
        const group = await prisma.academicGroup.findUnique({
          where: { id: sessionWithHomework.groupId },
          select: { teacherId: true, gradeLevel: true, name: true },
        });
        if (group) {
          const formattedDate =
            sessionWithHomework.sessionDate instanceof Date
              ? sessionWithHomework.sessionDate.toISOString().slice(0, 10)
              : String(sessionWithHomework.sessionDate).slice(0, 10);
          const autoAssessment = await prisma.assessment.create({
            data: {
              title: sessionWithHomework.topic
                ? `واجب: ${sessionWithHomework.topic}`
                : `واجب حصة ${formattedDate}`,
              type: AssessmentType.ASSIGNMENT,
              teacherId: group.teacherId,
              groupId: sessionWithHomework.groupId,
              gradeLevel: group.gradeLevel,
              homeworkDeliveryType: HomeworkDeliveryType.ONSITE,
              totalScore: 10.0,
              isPublished: true,
            },
          });
          targetAssessmentId = autoAssessment.id;
        }
      }
    } catch (resErr) {
      logger.warn(`Could not resolve assessment for session [${sessionId}]:`, resErr);
    }
  }

  const recordDate = new Date(clientTimestamp || Date.now());

  await prisma.$transaction(async (tx) => {
    if (targetAssessmentId) {
      await tx.homeworkRecord.upsert({
        where: {
          assessmentId_studentId_sessionId: {
            assessmentId: targetAssessmentId,
            studentId,
            sessionId,
          },
        },
        update: {
          status: (status as HomeworkSubmissionStatus) || HomeworkSubmissionStatus.CHECKED_ONSITE,
          recordedMethod: (recordedMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
          score: score !== undefined ? score : undefined,
          feedback: feedback !== undefined ? feedback : undefined,
          updatedAt: recordDate,
        },
        create: {
          assessmentId: targetAssessmentId,
          studentId,
          sessionId,
          status: (status as HomeworkSubmissionStatus) || HomeworkSubmissionStatus.CHECKED_ONSITE,
          checkedByRole: user?.role || UserRole.TEACHER,
          recordedMethod: (recordedMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
          score: score ?? null,
          feedback: feedback ?? null,
          clientTimestamp: recordDate,
          createdAt: recordDate,
          updatedAt: recordDate,
        },
      });
    }

    await tx.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
      update: {
        status: AttendanceStatus.PRESENT,
        recordingMethod: (recordedMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
        recordedAt: recordDate,
      },
      create: {
        sessionId,
        studentId,
        status: AttendanceStatus.PRESENT,
        recordingMethod: (recordedMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
        recordedById: user.id,
        recordedAt: recordDate,
      },
    });
  });

  return { mutationId: mutation.id, status: 'SUCCESS' };
}

export async function handleAttendanceMutation(
  mutation: SyncMutationItemDto,
  user: AuthenticatedUser,
  prisma: PrismaService,
  sessionMap: Map<string, any>,
  studentMap: Map<string, any>,
  recorderId: string,
): Promise<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }> {
  const { sessionId, studentId, qrCodeToken, status, recordingMethod, clientTimestamp, allowCrossGroup, notes } =
    mutation.payload || {};

  let targetStudentId = studentId;
  const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetStudentId || '');

  if ((!targetStudentId || !isTargetUuid) && (qrCodeToken || targetStudentId)) {
    const trimmedToken = (qrCodeToken || targetStudentId).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken);

    let student = studentMap.get(trimmedToken);
    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: {
          OR: [
            { qrCodeToken: trimmedToken },
            { studentCode: trimmedToken },
            ...(isUuid ? [{ id: trimmedToken }] : []),
          ],
        },
        include: {
          user: { select: { isActive: true } },
          groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
        },
      });
      if (student) studentMap.set(trimmedToken, student);
    }

    if (!student || !student.user.isActive) {
      return { mutationId: mutation.id, status: 'FAILED', error: 'INVALID_QR_CODE' };
    }
    targetStudentId = student.id;
  }

  if (!targetStudentId || !sessionId) {
    return {
      mutationId: mutation.id,
      status: 'FAILED',
      error: `Missing required parameters for RECORD_ATTENDANCE`,
    };
  }

  if (user?.role === UserRole.STUDENT || user?.role === UserRole.PARENT) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'UNAUTHORIZED_ROLE' };
  }

  let session = sessionMap.get(sessionId);
  if (!session) {
    session = await prisma.lessonSession.findUnique({
      where: { id: sessionId },
      select: {
        groupId: true,
        group: {
          select: { teacherId: true },
        },
      },
    });
    if (session) sessionMap.set(sessionId, session);
  }

  if (!session) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'SESSION_NOT_FOUND' };
  }

  if (user?.role === UserRole.TEACHER) {
    const teacherId = user.teacherProfileId || user.id;
    if (session.group?.teacherId && session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
      return { mutationId: mutation.id, status: 'FAILED', error: 'FORBIDDEN_GROUP_ACCESS' };
    }
  }

  let studentData = studentMap.get(targetStudentId);
  if (!studentData) {
    studentData = await prisma.studentProfile.findFirst({
      where: { id: targetStudentId },
      include: {
        user: { select: { isActive: true } },
        groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
      },
    });
    if (studentData) studentMap.set(targetStudentId, studentData);
  }

  if (!studentData || !studentData.user.isActive) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_INACTIVE_OR_NOT_FOUND' };
  }

  const directEnrollment = studentData.groupEnrollments.some((e: any) => e.groupId === session.groupId);
  if (!directEnrollment && !allowCrossGroup) {
    return { mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_NOT_ENROLLED' };
  }

  const recordDate = new Date(clientTimestamp || Date.now());

  await prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId: targetStudentId,
      },
    },
    update: {
      status: (status as AttendanceStatus) || AttendanceStatus.PRESENT,
      recordingMethod: (recordingMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
      notes: notes !== undefined ? notes : undefined,
      recordedAt: recordDate,
    },
    create: {
      sessionId,
      studentId: targetStudentId,
      status: (status as AttendanceStatus) || AttendanceStatus.PRESENT,
      recordingMethod: (recordingMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
      notes: notes ?? null,
      recordedById: recorderId,
      recordedAt: recordDate,
    },
  });

  if (status === AttendanceStatus.ABSENT && typeof prisma.homeworkRecord?.deleteMany === 'function') {
    await prisma.homeworkRecord.deleteMany({
      where: {
        sessionId,
        studentId: targetStudentId,
      },
    });
  }

  return { mutationId: mutation.id, status: 'SUCCESS' };
}
