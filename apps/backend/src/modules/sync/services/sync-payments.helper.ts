import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { DomainSyncResult } from './sync.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { PaymentStatus, PaymentType, UserRole } from '@prisma/client';

export async function handleDeletePaymentSync(
  tx: any,
  op: any,
  opId: string,
  user: AuthenticatedUser,
  result: DomainSyncResult,
  logger: Logger,
): Promise<void> {
  const targetPaymentId = op.paymentId || op.id;
  try {
    const payment = await tx.studentPaymentRecord.findUnique({
      where: { id: targetPaymentId },
      include: { group: true },
    });

    if (!payment) {
      result.duplicatesIgnored++;
      result.processedOperationIds.push(opId);
      return;
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (payment.group && payment.group.teacherId !== teacherId && payment.group.teacherId !== user.id) {
        result.conflicts.push({
          operationId: opId,
          reason: 'FORBIDDEN: You do not own the academic group for this payment',
          entityId: targetPaymentId,
        });
        result.failedCount++;
        return;
      }
    }

    await tx.studentPaymentRecord.delete({ where: { id: targetPaymentId } });

    result.syncedCount++;
    result.processedOperationIds.push(opId);
  } catch (err: any) {
    logger.error(`Failed to sync DELETE_PAYMENT op [${opId}]:`, err);
    result.failedCount++;
    result.conflicts.push({
      operationId: opId,
      reason: err?.message || 'Payment deletion transaction error',
    });
  }
}

export async function handleBookletPaymentSync(
  tx: any,
  op: any,
  opId: string,
  student: any,
  resolvedGroupId: string | null,
  incomingAmountPaid: number | undefined,
  clientExpected: number,
  periodYear: number,
  periodMonth: number,
  paymentDate: Date,
  recorderId: string,
  bookletMap: Map<string, any>,
  existingOpMap: Map<string, any>,
  result: DomainSyncResult,
): Promise<{ savedPaymentRecord: any; finalAmountPaid: number } | null> {
  const booklet =
    bookletMap.get(op.bookletId) ||
    (await tx.booklet.findUnique({
      where: { id: op.bookletId },
    }));

  const authoritativeExpected = booklet && Number(booklet.price) > 0 ? Number(booklet.price) : clientExpected;
  const amountPaid = incomingAmountPaid !== undefined ? incomingAmountPaid : authoritativeExpected;
  const amountExpected = authoritativeExpected;

  if (booklet && student.gradeLevel && booklet.gradeLevel && student.gradeLevel !== booklet.gradeLevel) {
    result.conflicts.push({
      operationId: opId,
      reason: 'هذه المذكرة غير مخصصة للصف الدراسي لهذا الطالب',
      code: 'BOOKLET_GRADE_MISMATCH',
      entityId: op.bookletId,
      details: {
        studentId: student.id,
        studentGradeLevel: student.gradeLevel,
        bookletId: booklet.id,
        bookletGradeLevel: booklet.gradeLevel,
      },
    });
    result.failedCount++;
    return null;
  }

  if (booklet?.groupId) {
    const studentGroupIds = student.groupEnrollments?.map((e: any) => e.groupId) || [];
    if (!studentGroupIds.includes(booklet.groupId)) {
      result.conflicts.push({
        operationId: opId,
        reason: 'INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب',
        entityId: op.bookletId,
      });
      result.failedCount++;
      return null;
    }
  }

  const existingBookletPayment = await tx.studentPaymentRecord.findFirst({
    where: {
      studentId: op.studentId,
      bookletId: op.bookletId,
      paymentType: PaymentType.BOOKLET,
    },
  });

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
    return null;
  }

  if (existingBookletPayment) {
    const existingPaid = Number(existingBookletPayment.amountPaid || 0);
    const existingExpected = Math.max(Number(existingBookletPayment.amountExpected || 0), amountExpected);
    
    const isExistingFullyPaid = existingPaid >= existingExpected && existingExpected > 0;
    const isIncomingFullPayment = amountPaid >= amountExpected && amountExpected > 0;

    if (isExistingFullyPaid && isIncomingFullPayment) {
      result.conflicts.push({
        operationId: opId,
        reason: 'DUPLICATE_BUSINESS_PAYMENT: This booklet is already fully paid.',
        entityId: existingBookletPayment.id,
      });
      result.duplicatesIgnored++;
      result.processedOperationIds.push(opId);
      if (result.idMappings && op.clientTempId) {
        result.idMappings[op.clientTempId] = existingBookletPayment.id;
      }
      return null;
    }

    const newTotalPaid = existingPaid + amountPaid;
    const newExpected = Math.max(amountExpected, existingExpected);
    const newStatus = newTotalPaid >= newExpected && newExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

    const updated = await tx.studentPaymentRecord.update({
      where: { id: existingBookletPayment.id },
      data: {
        amountPaid: newTotalPaid,
        amountExpected: newExpected,
        paymentStatus: newStatus,
        paymentMethod: op.paymentMethod || existingBookletPayment.paymentMethod,
        receiptNumber: op.receiptNumber || existingBookletPayment.receiptNumber,
        notes: op.notes || existingBookletPayment.notes,
        recordedById: recorderId,
        updatedAt: new Date(),
      },
    });
    return { savedPaymentRecord: updated, finalAmountPaid: amountPaid };
  } else {
    const finalStatus = amountPaid >= amountExpected && amountExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

    const savedPaymentRecord = await tx.studentPaymentRecord.create({
      data: {
        operationId: opId,
        studentId: op.studentId,
        groupId: resolvedGroupId || null,
        bookletId: op.bookletId,
        paymentType: PaymentType.BOOKLET,
        periodYear,
        periodMonth,
        amountPaid,
        amountExpected: amountExpected,
        paymentStatus: finalStatus,
        paymentMethod: op.paymentMethod || 'CASH',
        currency: op.currency || 'EGP',
        receiptNumber: op.receiptNumber || `REC-BKT-${randomUUID().slice(0, 8)}`,
        notes: op.notes || 'Synced booklet payment from offline outbox',
        recordedById: recorderId,
        createdAt: paymentDate,
        updatedAt: paymentDate,
      },
    });

    if (typeof tx.booklet?.update === 'function') {
      try {
        const b = await tx.booklet.findUnique({ where: { id: op.bookletId } });
        if (b && b.stockCount !== null && b.stockCount > 0) {
          await tx.booklet.update({
            where: { id: op.bookletId },
            data: { stockCount: { decrement: 1 } },
          });
        }
      } catch {
        // non-blocking
      }
    }

    return { savedPaymentRecord, finalAmountPaid: amountPaid };
  }
}
