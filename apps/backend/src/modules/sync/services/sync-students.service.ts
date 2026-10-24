import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { generateSecurePassword, getTemporaryPinExpiration } from '../../../common/utils/password.util';
import { UnifiedSyncBatchDto } from '../dto/sync-batch.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SyncAttendanceService } from './sync-attendance.service';
import { SyncPaymentsService } from './sync-payments.service';
import { SyncAssessmentsService } from './sync-assessments.service';
import { SyncHomeworkService } from './sync-homework.service';
import { SyncMutationsService } from './sync-mutations.service';
import { DomainSyncResult } from './sync.service';
import {
  GroupEnrollmentStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class SyncStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly attendanceService: SyncAttendanceService,
    private readonly paymentsService: SyncPaymentsService,
    private readonly assessmentsService: SyncAssessmentsService,
    private readonly homeworkService: SyncHomeworkService,
    private readonly mutationsService: SyncMutationsService,
  ) {}

  async syncUnifiedBatch(
    user: AuthenticatedUser,
    dto: UnifiedSyncBatchDto,
  ) {
    const idMappings: {
      groups: Record<string, string>;
      students: Record<string, { id: string; studentCode: string; qrCodeToken: string }>;
      payments: Record<string, string>;
    } = {
      groups: {},
      students: {},
      payments: {},
    };

    // 1. Transactional Groups & Students Batch Ingestion
    if ((dto.groups && dto.groups.length > 0) || (dto.students && dto.students.length > 0)) {
      await this.prisma.$transaction(async (tx) => {
        let effectiveTeacherId = user.teacherProfileId || user.id;
        if (user.role === UserRole.SECRETARIAT && typeof tx.teacherAssistant?.findFirst === 'function') {
          const link = await tx.teacherAssistant.findFirst({
            where: { assistantId: user.id, status: 'ACTIVE' },
            select: { teacherId: true },
          });
          if (link) {
            effectiveTeacherId = link.teacherId;
          }
        } else if (typeof tx.teacherProfile?.findFirst === 'function') {
          const teacherProfile = await tx.teacherProfile.findFirst({
            where: {
              OR: [
                { id: user.teacherProfileId },
                { user: { id: user.id } },
                { id: user.id },
              ],
            },
          });
          if (teacherProfile) {
            effectiveTeacherId = teacherProfile.id;
          }
        }

        // Step A: Groups Ingestion
        if (dto.groups && dto.groups.length > 0) {
          for (const g of dto.groups) {
            const existing = await tx.academicGroup.findFirst({
              where: {
                OR: [
                  { id: g.clientTempId },
                  { name: g.name, teacherId: effectiveTeacherId },
                ],
              },
            });

            if (existing) {
              if (g.type === 'UPDATE_GROUP') {
                if (g.clientTimestamp && existing.updatedAt) {
                  const clientDate = new Date(g.clientTimestamp);
                  if (existing.updatedAt > clientDate) {
                    throw new ConflictException(`Group [${existing.id}] was modified online since your last sync.`);
                  }
                }
                
                await tx.academicGroup.update({
                  where: { id: existing.id },
                  data: {
                    name: g.name,
                    gradeLevel: g.gradeLevel,
                    academicYear: g.academicYear ?? existing.academicYear,
                    academicTerm: g.academicTerm ?? existing.academicTerm,
                    description: g.description,
                    maxCapacity: g.maxCapacity ?? existing.maxCapacity,
                    monthlyFee: g.monthlyFee ?? existing.monthlyFee,
                    updatedAt: new Date(),
                  },
                });
              }
              idMappings.groups[g.clientTempId] = existing.id;
            } else {
              if (g.type === 'UPDATE_GROUP') {
                throw new NotFoundException(`Academic group [${g.clientTempId}] not found for update`);
              }
              const created = await tx.academicGroup.create({
                data: {
                  id: g.clientTempId,
                  name: g.name,
                  gradeLevel: g.gradeLevel,
                  academicYear: g.academicYear || '2026-2027',
                  academicTerm: g.academicTerm || 'FIRST_TERM',
                  description: g.description,
                  maxCapacity: g.maxCapacity || 50,
                  monthlyFee: g.monthlyFee || 0.0,
                  teacherId: effectiveTeacherId,
                  isActive: true,
                  schedules: g.schedules?.length
                    ? {
                        create: g.schedules.map((s: any) => ({
                          dayOfWeek: s.dayOfWeek,
                          startTime: s.startTime,
                          endTime: s.endTime,
                          location: s.location || null,
                        })),
                      }
                    : undefined,
                },
              });
              idMappings.groups[g.clientTempId] = created.id;
            }
          }
        }

        // Step B: Students Ingestion
        if (dto.students && dto.students.length > 0) {
          for (const s of dto.students) {
            const studentFullName = s.fullName || s.name || 'طالب';
            const isTempIdUuid =
              typeof s.clientTempId === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                s.clientTempId,
              );
            const studentIdForDb = isTempIdUuid ? s.clientTempId : randomUUID();

            const existingStudent = await tx.studentProfile.findFirst({
              where: {
                OR: [
                  ...(isTempIdUuid ? [{ id: s.clientTempId }] : []),
                  ...(s.phone ? [{ user: { phone: s.phone } }] : []),
                ],
              },
              include: { user: true },
            });

            let finalStudentId = studentIdForDb;
            let finalStudentCode = '';
            let finalQrToken = '';

            if (existingStudent) {
              if (s.type === 'UPDATE_STUDENT') {
                // Ensure teacher owns this student
                if (effectiveTeacherId && typeof tx.groupEnrollment?.findFirst === 'function') {
                  const hasAccess = await tx.groupEnrollment.findFirst({
                    where: {
                      studentId: existingStudent.id,
                      group: { teacherId: effectiveTeacherId }
                    }
                  });
                  if (!hasAccess) {
                    throw new ConflictException(`FORBIDDEN: You do not own the academic group for student [${s.clientTempId}]`);
                  }
                }

                if (s.clientTimestamp && existingStudent.user?.updatedAt) {
                  const clientDate = new Date(s.clientTimestamp);
                  if (existingStudent.user.updatedAt > clientDate) {
                    throw new ConflictException(`Student [${existingStudent.id}] was modified online since your last sync.`);
                  }
                }

                await tx.user.update({
                  where: { id: existingStudent.id },
                  data: {
                    fullName: s.fullName ?? s.name ?? existingStudent.user?.fullName,
                    phone: s.phone ?? existingStudent.user?.phone,
                    email: s.email ?? existingStudent.user?.email,
                    updatedAt: new Date(),
                  },
                });
                await tx.studentProfile.update({
                  where: { id: existingStudent.id },
                  data: {
                    gradeLevel: s.gradeLevel ?? existingStudent.gradeLevel,
                    academicStage: s.academicStage ?? existingStudent.academicStage,
                    emergencyPhone: s.parentPhone ?? existingStudent.emergencyPhone,
                  },
                });
              }
              finalStudentId = existingStudent.id;
              finalStudentCode = existingStudent.studentCode || '';
              finalQrToken = existingStudent.qrCodeToken || '';
            } else {
              if (s.type === 'UPDATE_STUDENT') {
                throw new NotFoundException(`Student [${s.clientTempId}] not found for update`);
              }
              const studentPassword = s.password?.trim() || generateSecurePassword(8);
              const passwordHash = await bcrypt.hash(studentPassword, 10);
              const userRecord = await tx.user.create({
                data: {
                  id: studentIdForDb,
                  fullName: studentFullName,
                  phone: s.phone,
                  email: s.email,
                  passwordHash,
                  role: UserRole.STUDENT,
                  isActive: true,
                },
              });

              finalStudentCode = await generateUniqueStudentCode(tx);
              finalQrToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

              const studentProfile = await tx.studentProfile.create({
                data: {
                  id: userRecord.id,
                  studentCode: finalStudentCode,
                  qrCodeToken: finalQrToken,
                  gradeLevel: s.gradeLevel,
                  academicStage: s.academicStage,
                  academicStatus: 'ACTIVE',
                  emergencyPhone: s.parentPhone,
                  tempAccessPin: s.password?.trim() ? null : studentPassword,
                  pinExpiresAt: s.password?.trim() ? null : getTemporaryPinExpiration(48),
                },
              });

              finalStudentId = studentProfile.id;

              // Link Parent if provided
              if (s.parentPhone) {
                let parentUser = await tx.user.findUnique({
                  where: { phone: s.parentPhone },
                  include: { parentProfile: true },
                });

                if (!parentUser) {
                  const parentTempPassword = generateSecurePassword(8);
                  const parentPasswordHash = await bcrypt.hash(parentTempPassword, 10);
                  parentUser = await tx.user.create({
                    data: {
                      fullName: s.parentName || `ولي أمر ${studentFullName}`,
                      phone: s.parentPhone,
                      passwordHash: parentPasswordHash,
                      role: UserRole.PARENT,
                      isActive: true,
                      parentProfile: {
                        create: {
                          relationshipType: s.parentRelationship || 'ولي أمر',
                        },
                      },
                    },
                    include: { parentProfile: true },
                  });
                }

                if (parentUser.parentProfile) {
                  await tx.parentStudentLink.create({
                    data: {
                      parentId: parentUser.parentProfile.id,
                      studentId: finalStudentId,
                    },
                  });
                }
              }
            }

            // Step C: Enroll in group if provided
            const targetGroupId = s.groupId || s.initialGroupId;
            if (targetGroupId) {
              const resolvedGroupId = idMappings.groups[targetGroupId] || targetGroupId;
              const isCreatedInThisBatch = Boolean(idMappings.groups[targetGroupId]);

              const groupExists =
                isCreatedInThisBatch ||
                (typeof tx.academicGroup?.findFirst === 'function'
                  ? await tx.academicGroup.findFirst({ where: { id: resolvedGroupId } })
                  : typeof tx.academicGroup?.findUnique === 'function'
                  ? await tx.academicGroup.findUnique({ where: { id: resolvedGroupId } })
                  : true);

              if (groupExists) {
                const existingEnrollment =
                  typeof tx.groupEnrollment?.findFirst === 'function'
                    ? await tx.groupEnrollment.findFirst({
                        where: {
                          groupId: resolvedGroupId,
                          studentId: finalStudentId,
                        },
                      })
                    : null;

                if (!existingEnrollment && typeof tx.groupEnrollment?.create === 'function') {
                  await tx.groupEnrollment.create({
                    data: {
                      groupId: resolvedGroupId,
                      studentId: finalStudentId,
                      status: GroupEnrollmentStatus.ACTIVE,
                    },
                  });
                }
              }
            }

            idMappings.students[s.clientTempId] = {
              id: finalStudentId,
              studentCode: finalStudentCode,
              qrCodeToken: finalQrToken,
            };
          }
        }
      });
    }

    const results: {
      attendance?: DomainSyncResult;
      payments?: DomainSyncResult;
      progress?: any;
      assessments?: DomainSyncResult;
      homework?: DomainSyncResult;
      mutations?: Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>;
    } = {};

    if (dto.attendance && dto.attendance.length > 0) {
      results.attendance = await this.attendanceService.syncAttendanceBatch(user, {
        operations: dto.attendance,
      });
    }

    if (dto.payments && dto.payments.length > 0) {
      results.payments = await this.paymentsService.syncPaymentsBatch(user, {
        operations: dto.payments,
      });
      if (results.payments.idMappings) {
        idMappings.payments = {
          ...(idMappings.payments || {}),
          ...results.payments.idMappings,
        };
      }
    }

    if (dto.progress && dto.progress.length > 0) {
      const studentId = user.studentProfileId || user.id;
      results.progress = await this.coursesService.applyMonotonicProgressBatch(studentId, dto.progress);
    }

    if (dto.assessments && dto.assessments.length > 0) {
      const studentId = user.studentProfileId || user.id;
      results.assessments = await this.assessmentsService.syncAssessmentsBatch(studentId, {
        operations: dto.assessments,
      });
    }

    if (dto.homework && dto.homework.length > 0) {
      results.homework = await this.homeworkService.syncHomeworkBatch(user, {
        operations: dto.homework,
      });
    }

    if (dto.mutations && dto.mutations.length > 0) {
      results.mutations = await this.mutationsService.processMutationBatch(user, dto.mutations);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      idMappings,
      results,
    };
  }
}
