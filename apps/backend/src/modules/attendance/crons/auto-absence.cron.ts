import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus, AssessmentType, HomeworkSubmissionStatus } from '@prisma/client';
import * as cron from 'node-cron';
import { isSessionEndedPlusOneHour, getSessionEndUtcDate } from '../utils/attendance.util';

@Injectable()
export class AutoAbsenceCron implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoAbsenceCron.name);
  private task?: cron.ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Run every 15 minutes during active center operating hours (07:00 to 23:00 Cairo time)
    this.task = cron.schedule('*/15 7-23 * * *', () => void this.run(), {
      timezone: 'Africa/Cairo',
    });
    this.logger.log('Auto absence cron initialized (07:00-23:00 Cairo)');
  }

  onModuleDestroy() {
    this.task?.stop();
  }

  async run(now = new Date()): Promise<void> {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(now),
    );
    if (hour < 7 || hour >= 23) {
      return;
    }

    try {
      this.logger.log('Running AutoAbsenceCron to mark absentees...');
      
      // Only process sessions from the last 24 hours to prevent evaluating historical sessions
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      oneDayAgo.setHours(0, 0, 0, 0);

      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          isCancelled: false,
          sessionDate: {
            gte: oneDayAgo,
          },
        },
        include: {
          group: true,
        },
      });

      for (const session of sessions) {
        if (!isSessionEndedPlusOneHour(session.sessionDate, session.startTime, session.endTime, now)) {
          continue;
        }

        const sessionEndTime = getSessionEndUtcDate(session.sessionDate, session.startTime, session.endTime);
        if (!sessionEndTime) continue;

        // Only enrollments that took place BEFORE the session ended are eligible to be marked absent.
        // Students who registered/enrolled after the session ended must NEVER be marked absent.
        const activeEnrollments = await this.prisma.groupEnrollment.findMany({
          where: {
            groupId: session.groupId,
            status: GroupEnrollmentStatus.ACTIVE,
            enrolledAt: {
              lte: sessionEndTime,
            },
          },
          select: { studentId: true },
        });

        if (activeEnrollments.length === 0) continue;
        const studentIds = activeEnrollments.map((e) => e.studentId);

        // Attendance is strictly recorded manually by the teacher/secretary.
        // We load existing attendance solely to evaluate homework for attendees.
        const existingAttendance = await this.prisma.attendanceRecord.findMany({
          where: { sessionId: session.id },
          select: { studentId: true, status: true },
        });
        const attendanceMap = new Map(existingAttendance.map((a) => [a.studentId, a.status]));

        // --- 2. Handle Homework Submission (Due in this session from previous session) ---
        // CRITICAL BUSINESS RULES:
        // A) Homework assigned in a session is due to be submitted during the NEXT session.
        // B) Therefore, when `session` ends (+ 1 hour), we evaluate whether students submitted
        //    the homework assigned in the PREVIOUS session of this group.
        // C) Under NO circumstances do we evaluate `session`'s own homework when `session` ends,
        //    because that homework was just assigned and is due in the NEXT session!
        // D) "Send only one message not two":
        //    - Absent students ALREADY received the absence alert for this session.
        //    - Only students who were PRESENT in this session and failed to submit the previous homework
        //      receive the missing homework alert.
        //    - Absent students NEVER receive a homework alert.

        const previousSession = await this.prisma.lessonSession.findFirst({
          where: {
            groupId: session.groupId,
            isCancelled: false,
            sessionDate: {
              lt: session.sessionDate,
            },
          },
          orderBy: { sessionDate: 'desc' },
        });

        if (previousSession) {
          const prevDateEnd = new Date(previousSession.sessionDate);
          prevDateEnd.setHours(23, 59, 59, 999);

          // Find the assessment linked to the previous session
          const prevHomeworkRecord = await this.prisma.homeworkRecord.findFirst({
            where: { sessionId: previousSession.id },
            select: { assessmentId: true },
          });

          let dueAssessmentId: string | null = prevHomeworkRecord?.assessmentId || null;
          let dueAssessmentTitle: string = '';

          if (dueAssessmentId) {
            const assessment = await this.prisma.assessment.findUnique({
              where: { id: dueAssessmentId },
              select: { title: true },
            });
            dueAssessmentTitle = assessment?.title || 'واجب الحصة السابقة';
          } else {
            // Check if teacher created an assignment for this group on or before the previous session date
            const assessment = await this.prisma.assessment.findFirst({
              where: {
                groupId: session.groupId,
                type: AssessmentType.ASSIGNMENT,
                isPublished: true,
                createdAt: { lte: prevDateEnd },
              },
              orderBy: { createdAt: 'desc' },
              select: { id: true, title: true },
            });

            if (assessment) {
              dueAssessmentId = assessment.id;
              dueAssessmentTitle = assessment.title;
            }
          }

          if (dueAssessmentId) {
            // Find all students who have already submitted this assessment (either in previous session or in current session)
            const submittedRecords = await this.prisma.homeworkRecord.findMany({
              where: {
                assessmentId: dueAssessmentId,
                studentId: { in: studentIds },
                status: {
                  in: [
                    HomeworkSubmissionStatus.CHECKED_ONSITE,
                    HomeworkSubmissionStatus.SUBMITTED_ONLINE,
                    HomeworkSubmissionStatus.EXCUSED,
                  ],
                },
              },
              select: { studentId: true },
            });

            const submittedStudentIds = new Set(submittedRecords.map((r) => r.studentId));

            // Check if any student already has a homework record for this session & assessment
            // (e.g. was already recorded or marked NOT_SUBMITTED in an earlier run of the cron)
            const existingHomeworkRecords = await this.prisma.homeworkRecord.findMany({
              where: {
                assessmentId: dueAssessmentId,
                sessionId: session.id,
                studentId: { in: studentIds },
              },
              select: { studentId: true },
            });
            const alreadyRecordedHomeworkStudentIds = new Set(
              existingHomeworkRecords.map((r) => r.studentId),
            );

            // CRITICAL: Only students who:
            // 1. ATTENDED this session (status === PRESENT)
            // 2. Did NOT submit the homework (not in submittedStudentIds)
            // 3. Have NOT already been evaluated/recorded for this session (not in alreadyRecordedHomeworkStudentIds)
            // Absent students already received the absence alert and must NOT receive a second message.
            const attendedStudentIds = studentIds.filter((id) => {
              return attendanceMap.get(id) === AttendanceStatus.PRESENT;
            });

            const missingHomeworkIds = attendedStudentIds.filter(
              (id) => !submittedStudentIds.has(id) && !alreadyRecordedHomeworkStudentIds.has(id),
            );

            if (missingHomeworkIds.length > 0) {
              const homeworkData = missingHomeworkIds.map((studentId) => ({
                assessmentId: dueAssessmentId!,
                sessionId: session.id,
                studentId,
                status: HomeworkSubmissionStatus.NOT_SUBMITTED,
                recordedMethod: RecordingMethod.MANUAL,
                feedback: 'لم يتم تسليم الواجب في الحصة التالية',
                clientTimestamp: new Date(),
              }));

              await this.prisma.homeworkRecord.createMany({
                data: homeworkData,
                skipDuplicates: true,
              });

              missingHomeworkIds.forEach((studentId) => {
                if (shouldSendLiveNotification) {
                  this.eventEmitter.emit('student.homework.missing', {
                    studentId,
                    assessmentTitle: dueAssessmentTitle,
                    groupName: session.group?.name || '',
                    date: session.sessionDate,
                  });
                }
              });

              this.logger.log(
                `AutoAbsence: Marked ${missingHomeworkIds.length} ATTENDED students as NOT_SUBMITTED for previous homework [${dueAssessmentTitle}] in session ${session.id}`,
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Auto absence cron failed', error);
    }
  }
}
