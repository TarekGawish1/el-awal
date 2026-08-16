"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
let SubscriptionsService = class SubscriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordStudentPayment(dto) {
        return this.prisma.studentPaymentRecord.upsert({
            where: {
                studentId_groupId_periodYear_periodMonth: {
                    studentId: dto.studentId,
                    groupId: dto.groupId || '00000000-0000-0000-0000-000000000000',
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
                paymentStatus: dto.paymentStatus || client_1.PaymentStatus.PAID,
                paymentMethod: dto.paymentMethod || 'CASH',
                receiptNumber: dto.receiptNumber,
                notes: dto.notes,
                recordedById: dto.recordedById,
            },
            update: {
                amountPaid: dto.amountPaid,
                paymentStatus: dto.paymentStatus || client_1.PaymentStatus.PAID,
                paymentMethod: dto.paymentMethod,
                receiptNumber: dto.receiptNumber,
                notes: dto.notes,
                recordedById: dto.recordedById,
            },
        });
    }
    async getStudentPaymentHistory(studentId) {
        return this.prisma.studentPaymentRecord.findMany({
            where: { studentId },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            include: {
                group: { select: { name: true } },
            },
        });
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map