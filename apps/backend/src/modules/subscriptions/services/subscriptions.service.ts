import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentStatus } from '@prisma/client';

export interface RecordPaymentDto {
  studentId: string;
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  amountExpected: number;
  amountPaid: number;
  currency?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  recordedById: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordStudentPayment(dto: RecordPaymentDto) {
    return this.prisma.studentPaymentRecord.upsert({
      where: {
        studentId_groupId_periodYear_periodMonth: {
          studentId: dto.studentId,
          groupId: dto.groupId || '00000000-0000-0000-0000-000000000000', // Default empty UUID representation if null
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
        },
      },
      create: {
        studentId: dto.studentId,
        groupId: dto.groupId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
        amountExpected: dto.amountExpected,
        amountPaid: dto.amountPaid,
        currency: dto.currency || 'EGP',
        paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod || 'CASH',
        receiptNumber: dto.receiptNumber,
        notes: dto.notes,
        recordedById: dto.recordedById,
      },
      update: {
        amountPaid: dto.amountPaid,
        paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
        paymentMethod: dto.paymentMethod,
        receiptNumber: dto.receiptNumber,
        notes: dto.notes,
        recordedById: dto.recordedById,
      },
    });
  }

  async getStudentPaymentHistory(studentId: string) {
    return this.prisma.studentPaymentRecord.findMany({
      where: { studentId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        group: { select: { name: true } },
      },
    });
  }
}
