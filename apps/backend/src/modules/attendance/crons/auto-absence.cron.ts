import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus, AssessmentType, HomeworkSubmissionStatus } from '@prisma/client';
import * as cron from 'node-cron';

@Injectable()
export class AutoAbsenceCron implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoAbsenceCron.name);
  private task?: cron.ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Run every 15 minutes
    this.task = cron.schedule('*/15 * * * *', () => void this.run(), {
      timezone: 'Africa/Cairo',
    });
    this.logger.log('Auto absence cron initialized');
  }

  onModuleDestroy() {
    this.task?.stop();
  }

  async run(now = new Date()): Promise<void> {
    try {
      this.logger.log('Running AutoAbsenceCron to mark absentees...');
      
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          isCancelled: false,
          sessionDate: {
            gte: oneDayAgo,
          },
        },
        include: {
          group: true,
        }
      });
      
      for (const session of sessions) {
        if (!session.endTime && !session.startTime) continue;
        
        const dateStr = session.sessionDate.toISOString().split('T')[0];
        const timePart = session.endTime || session.startTime;
        const timePartSecs = timePart.split(':').length === 2 ? `${timePart}:00` : timePart;
        
        let sessionEndDateTime = new Date(`${dateStr}T${timePartSecs}`);
        
        if (!session.endTime && session.startTime) {
           sessionEndDateTime = new Date(sessionEndDateTime.getTime() + 2 * 60 * 60 * 1000);
        }
        
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (now.getTime() > (sessionEndDateTime.getTime() + ONE_HOUR)) {
          
          const activeEnrollments = await this.prisma.groupEnrollment.findMany({
            where: {
              groupId: session.groupId,
              status: GroupEnrollmentStatus.ACTIVE,
            },
            select: { studentId: true }
          });
          
          if (activeEnrollments.length === 0) continue;
          const studentIds = activeEnrollments.map(e => e.studentId);
          
          // --- 1. Handle Attendance ---
          const existingAttendance = await this.prisma.attendanceRecord.findMany({
            where: { sessionId: session.id },
            select: { studentId: true }
          });
          const presentOrExcusedIds = new Set(existingAttendance.map(a => a.studentId));
          
          const missingAttendanceIds = studentIds.filter(id => !presentOrExcusedIds.has(id));
          
          if (missingAttendanceIds.length > 0) {
            const attendanceData = missingAttendanceIds.map(studentId => ({
              sessionId: session.id,
              studentId,
              status: AttendanceStatus.ABSENT,
              recordingMethod: RecordingMethod.MANUAL,
              recordedById: session.group.teacherId, // Using the teacher's ID as the system recorder
              notes: 'غياب تلقائي بعد انتهاء الحصة',
              recordedAt: new Date(),
            }));
            
            await this.prisma.attendanceRecord.createMany({
              data: attendanceData,
              skipDuplicates: true,
            });
            
            missingAttendanceIds.forEach(studentId => {
              this.eventEmitter.emit('student.absence.recorded', {
                studentId,
                groupName: session.group?.name || '',
                date: session.sessionDate,
              });
            });
            
            this.logger.log(`AutoAbsence: Marked ${missingAttendanceIds.length} students as ABSENT for session ${session.id}`);
          }
          
          // --- 2. Handle Homework ---
          const existingHomework = await this.prisma.homeworkRecord.findMany({
            where: { sessionId: session.id },
            select: { studentId: true, assessmentId: true }
          });

          // If no homework was scanned at all for this session, assume there was no homework required
          if (existingHomework.length === 0) {
            this.logger.log(`AutoAbsence: No homework recorded for session ${session.id}, skipping missing homework check.`);
          } else {
            const submittedHomeworkIds = new Set(existingHomework.map(h => h.studentId));
            const missingHomeworkIds = studentIds.filter(id => !submittedHomeworkIds.has(id));
            
            if (missingHomeworkIds.length > 0) {
              // Use the assessmentId that was actually used for the submitted homeworks in this session
              const assessmentIdToUse = existingHomework[0].assessmentId;
              
              const assessment = await this.prisma.assessment.findUnique({
                where: { id: assessmentIdToUse }
              });
              
              if (assessment) {
                const homeworkData = missingHomeworkIds.map(studentId => ({
                  assessmentId: assessment.id,
                  sessionId: session.id,
                  studentId,
                  status: HomeworkSubmissionStatus.NOT_SUBMITTED,
                  recordedMethod: RecordingMethod.MANUAL,
                  feedback: 'لم يتم تسليم الواجب',
                  clientTimestamp: new Date(),
                }));
                
                await this.prisma.homeworkRecord.createMany({
                  data: homeworkData,
                  skipDuplicates: true,
                });
                
                missingHomeworkIds.forEach(studentId => {
                  this.eventEmitter.emit('student.homework.missing', {
                    studentId,
                    assessmentTitle: assessment.title,
                    groupName: session.group?.name || '',
                    date: session.sessionDate,
                  });
                });

                this.logger.log(`AutoAbsence: Marked ${missingHomeworkIds.length} students as NOT_SUBMITTED homework for session ${session.id}`);
              }
            }
          }
          
        }
      }
    } catch (error) {
      this.logger.error('Auto absence cron failed', error);
    }
  }
}
