import { handleBookletPaymentSync, handleDeletePaymentSync } from './sync-payments.helper';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SyncPaymentsBatchDto } from '../dto/sync-payments.dto';
import { DomainSyncResult } from './sync.service';
import {
  PaymentStatus,
  PaymentType,
  GroupEnrollmentStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class SyncPaymentsService {
  private readonly logger = new Logger(SyncPaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncPaymentsBatch(
    user: AuthenticatedUser,
    dto: SyncPaymentsBatchDto,
  ): Promise<DomainSyncResult> {
    const result: DomainSyncResult = {
      syncedCount: 0,
      duplicatesIgnored: 0,
      failedCount: 0,
      processedOperationIds: [],
      conflicts: [],
      idMappings: {},
      processedPayments: [],
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    const MAX_SYNC_BATCH = 500;
    const operations = dto.operations.slice(0, MAX_SYNC_BATCH);
    const recorderId = user.id;

    // Batch Prefetch Optimization: Pre-fetch referenced students, groups, booklets, and existing operations
    const studentIds = Array.from(new Set(operations.map((op) => op.studentId).filter(Boolean)));
    let preloadedStudents: any[] = [];
    try {
      if (studentIds.length > 0 && typeof this.prisma.studentProfile?.findMany === 'function') {
        const fetched = await this.prisma.studentProfile.findMany({
          where: { id: { in: studentIds } },
          include: { groupEnrollments: true },
        });
        if (Array.isArray(fetched)) preloadedStudents = fetched;
      }
    } catch {
      preloadedStudents = [];
    }
    const studentMap = new Map(preloadedStudents.map((s) => [s.id, s]));

    const candidateGroupIds = new Set<string>();
    for (const op of operations) {
      if (op.groupId) candidateGroupIds.add(op.groupId);
    }
    for (const st of preloadedStudents) {
      for (const ge of st.groupEnrollments || []) {
        if (ge.groupId) candidateGroupIds.add(ge.groupId);
      }
    }

    let preloadedGroups: any[] = [];
    try {
      if (candidateGroupIds.size > 0 && typeof this.prisma.academicGroup?.findMany === 'function') {
        const fetched = await this.prisma.academicGroup.findMany({
          where: { id: { in: Array.from(candidateGroupIds) } },
          select: { id: true, teacherId: true, monthlyFee: true },
        });
        if (Array.isArray(fetched)) preloadedGroups = fetched;
      }
    } catch {
      preloadedGroups = [];
    }
    const groupMap = new Map(preloadedGroups.map((g) => [g.id, g]));

    const bookletIds = Array.from(new Set(operations.map((op) => op.bookletId).filter(Boolean)));
    let preloadedBooklets: any[] = [];
    try {
      if (bookletIds.length > 0 && typeof this.prisma.booklet?.findMany === 'function') {
        const fetched = await this.prisma.booklet.findMany({
          where: { id: { in: bookletIds } },
        });
        if (Array.isArray(fetched)) preloadedBooklets = fetched;
      }
    } catch {
      preloadedBooklets = [];
    }
    const bookletMap = new Map(preloadedBooklets.map((b) => [b.id, b]));

    const opIds = operations.map((op) => op.id || op.clientTempId).filter(Boolean) as string[];
    let preloadedExistingOps: any[] = [];
    try {
      if (opIds.length > 0 && typeof this.prisma.studentPaymentRecord?.findMany === 'function') {
        const fetched = await this.prisma.studentPaymentRecord.findMany({
          where: { operationId: { in: opIds } },
        });
        if (Array.isArray(fetched)) preloadedExistingOps = fetched;
      }
    } catch {
      preloadedExistingOps = [];
    }
    const existingOpMap = new Map(preloadedExistingOps.map((p) => [p.operationId!, p]));

    for (const op of operations) {
      const opId = op.id || op.clientTempId || randomUUID();

      if (op.type === 'DELETE_PAYMENT') {
        await this.prisma.$transaction(async (tx) => {
          await handleDeletePaymentSync(tx, op, opId, user, result, this.logger);
        });
        continue;
      }

      let incomingAmountPaid: number | undefined = undefined;
      if (op.amountPaid !== undefined && op.amountPaid !== null) {
        incomingAmountPaid = Number(op.amountPaid);
      } else if (op.amount !== undefined && op.amount !== null) {
        incomingAmountPaid = Number(op.amount);
      }

      if (incomingAmountPaid !== undefined && (isNaN(incomingAmountPaid) || !isFinite(incomingAmountPaid) || incomingAmountPaid < 0)) {
        result.failedCount++;
        result.conflicts.push({
          operationId: opId,
          reason: 'Invalid payment amount',
        });
        continue;
      }

      const clientExpected = Number(op.amountExpected ?? op.amount ?? 0);
      let finalAmountPaid = 0;

      const periodYear = op.periodYear || op.billingPeriodYear || new Date().getFullYear();
      const periodMonth = op.periodMonth || op.billingPeriodMonth || (new Date().getMonth() + 1);
      const paymentDate = op.collectedAt
        ? new Date(op.collectedAt)
        : op.clientTimestamp
        ? new Date(op.clientTimestamp)
        : new Date();

      try {
        await this.prisma.$transaction(async (tx) => {
          const student =
            studentMap.get(op.studentId) ||
            (await tx.studentProfile.findUnique({
              where: { id: op.studentId },
              include: { groupEnrollments: true },
            }));

          if (!student) {
            result.conflicts.push({
              operationId: opId,
              reason: `Student [${op.studentId}] not found in database`,
              entityId: op.studentId,
            });
            result.failedCount++;
            return;
          }

          if (user?.role === UserRole.STUDENT || user?.role === UserRole.PARENT) {
            result.conflicts.push({
              operationId: opId,
              reason: 'FORBIDDEN: Only teachers and staff are authorized to record payments',
            });
            result.failedCount++;
            return;
          }

          const isBookletOp = op.paymentType === 'BOOKLET' || Boolean(op.bookletId);

          let resolvedGroupId = op.groupId;
          if (!resolvedGroupId && student.groupEnrollments?.length > 0) {
            const activeEnrollment = student.groupEnrollments.find(
              (e: any) => e.status === GroupEnrollmentStatus.ACTIVE,
            );
            resolvedGroupId = activeEnrollment?.groupId || student.groupEnrollments[0].groupId;
          }

          let authoritativeMonthlyFee: number | null = null;
          if (resolvedGroupId && typeof tx.academicGroup?.findUnique === 'function') {
            const targetGroup =
              groupMap.get(resolvedGroupId) ||
              (await tx.academicGroup.findUnique({
                where: { id: resolvedGroupId },
                select: { id: true, teacherId: true, monthlyFee: true },
              }));

            if (!targetGroup) {
              result.conflicts.push({
                operationId: opId,
                reason: `Target group [${resolvedGroupId}] does not exist`,
                entityId: resolvedGroupId,
              });
              result.failedCount++;
              return;
            }

            if (user?.role === UserRole.TEACHER) {
              const teacherId = user.teacherProfileId || user.id;
              if (targetGroup.teacherId && targetGroup.teacherId !== teacherId && targetGroup.teacherId !== user.id) {
                result.conflicts.push({
                  operationId: opId,
                  reason: 'FORBIDDEN: You do not have authority to manage payments for this academic group',
                  entityId: resolvedGroupId,
                });
                result.failedCount++;
                return;
              }
            }

            if (targetGroup && Number(targetGroup.monthlyFee) > 0) {
              authoritativeMonthlyFee = Number(targetGroup.monthlyFee);
            }
          }

          let savedPaymentRecord: any = null;

          if (isBookletOp && op.bookletId) {
            const bktRes = await handleBookletPaymentSync(
              tx,
              op,
              opId,
              student,
              resolvedGroupId,
              incomingAmountPaid,
              clientExpected,
              periodYear,
              periodMonth,
              paymentDate,
              recorderId,
              bookletMap,
              existingOpMap,
              result,
            );
            if (!bktRes) return;
            savedPaymentRecord = bktRes.savedPaymentRecord;
            finalAmountPaid = bktRes.finalAmountPaid;          } else {
            // Tuition payment
            let authoritativeExpected = authoritativeMonthlyFee ?? clientExpected;
            if (authoritativeMonthlyFee === null && resolvedGroupId && typeof tx.academicGroup?.findUnique === 'function') {
              try {
                const group = await tx.academicGroup.findUnique({
                  where: { id: resolvedGroupId },
                  select: { monthlyFee: true },
                });
                if (group && Number(group.monthlyFee) > 0) {
                  authoritativeExpected = Number(group.monthlyFee);
                }
              } catch {}
            }
            
            const amountPaid = incomingAmountPaid !== undefined ? incomingAmountPaid : authoritativeExpected;
            const amountExpected = authoritativeExpected;
            finalAmountPaid = amountPaid;

            let existingPayment: any = null;
            if (resolvedGroupId) {
              existingPayment = await tx.studentPaymentRecord.findFirst({
                where: {
                  studentId: op.studentId,
                  groupId: resolvedGroupId,
                  periodYear,
                  periodMonth,
                  paymentType: PaymentType.TUITION,
                },
              });
            } else {
              existingPayment = await tx.studentPaymentRecord.findFirst({
                where: {
                  studentId: op.studentId,
                  periodYear,
                  periodMonth,
                  paymentType: PaymentType.TUITION,
                },
              });
            }

            const existingOp =
              existingOpMap.get(opId) ||
              (await tx.studentPaymentRecord.findUnique({
                where: { operationId: opId },
              }));
            if (existingOp) {
              result.duplicatesIgnored++;
              result.processedOperationIds.push(opId);
              if (result.idMappings) {
                if (op.clientTempId) result.idMappings[op.clientTempId] = existingOp.id;
                if (op.id) result.idMappings[op.id] = existingOp.id;
              }
              return;
            }

            if (existingPayment) {
              const existingPaid = Number(existingPayment.amountPaid || 0);
              const existingExpected = Math.max(Number(existingPayment.amountExpected || 0), amountExpected);
              
              const isExistingFullyPaid = existingPaid >= existingExpected && existingExpected > 0;
              const isIncomingFullPayment = amountPaid >= amountExpected && amountExpected > 0;

              if (isExistingFullyPaid && isIncomingFullPayment) {
                result.conflicts.push({
                  operationId: opId,
                  reason: 'DUPLICATE_BUSINESS_PAYMENT: This tuition period is already fully paid.',
                  entityId: existingPayment.id,
                });
                result.duplicatesIgnored++;
                result.processedOperationIds.push(opId);
                if (result.idMappings && op.clientTempId) {
                  result.idMappings[op.clientTempId] = existingPayment.id;
                }
                return;
              }

              const newTotalPaid = existingPaid + amountPaid;
              const newExpected = Math.max(amountExpected, existingExpected);
              const newStatus = newTotalPaid >= newExpected && newExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

              savedPaymentRecord = typeof tx.studentPaymentRecord?.update === 'function'
                ? await tx.studentPaymentRecord.update({
                    where: { id: existingPayment.id },
                    data: {
                      amountPaid: newTotalPaid,
                      amountExpected: newExpected,
                      paymentStatus: newStatus,
                      paymentMethod: op.paymentMethod || existingPayment.paymentMethod,
                      receiptNumber: op.receiptNumber || existingPayment.receiptNumber,
                      notes: op.notes || existingPayment.notes,
                      recordedById: recorderId,
                      updatedAt: new Date(),
                    },
                  })
                : existingPayment;
            } else {
              const finalStatus = amountPaid >= amountExpected && amountExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

              savedPaymentRecord = await tx.studentPaymentRecord.create({
                data: {
                  operationId: opId,
                  studentId: op.studentId,
                  groupId: resolvedGroupId || null,
                  paymentType: PaymentType.TUITION,
                  periodYear,
                  periodMonth,
                  amountPaid,
                  amountExpected: amountExpected,
                  paymentStatus: finalStatus,
                  paymentMethod: op.paymentMethod || 'CASH',
                  currency: op.currency || 'EGP',
                  receiptNumber: op.receiptNumber || `REC-${periodYear}-${String(periodMonth).padStart(2, '0')}-${randomUUID().slice(0, 8)}`,
                  notes: op.notes || 'Synced from offline outbox',
                  recordedById: recorderId,
                  createdAt: paymentDate,
                  updatedAt: paymentDate,
                },
              });
            }
          }

          if (resolvedGroupId && typeof tx.groupEnrollment?.updateMany === 'function') {
            await tx.groupEnrollment.updateMany({
              where: {
                studentId: op.studentId,
                groupId: resolvedGroupId,
              },
              data: {
                status: GroupEnrollmentStatus.ACTIVE,
              },
            });
          }

          const finalRecordId = savedPaymentRecord?.id || op.id || randomUUID();
          if (result.idMappings && op.clientTempId) {
            result.idMappings[op.clientTempId] = finalRecordId;
          } else if (result.idMappings && op.id) {
            result.idMappings[op.id] = finalRecordId;
          }

          result.processedPayments?.push({
            id: finalRecordId,
            studentId: op.studentId,
            groupId: resolvedGroupId,
            periodYear,
            periodMonth,
            amountPaid: finalAmountPaid,
            paymentStatus: PaymentStatus.PAID,
          });

          result.syncedCount++;
          result.processedOperationIds.push(opId);
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          result.duplicatesIgnored++;
          result.processedOperationIds.push(opId);
        } else {
          this.logger.error(`Failed to sync payment op [${opId}]:`, err);
          result.failedCount++;
          result.conflicts.push({
            operationId: opId,
            reason: err?.message || 'Payment sync transaction error',
          });
        }
      }
    }

    return result;
  }
}
