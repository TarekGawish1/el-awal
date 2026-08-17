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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SubscriptionsService_1.name);
    }
    async recordStudentPayment(user, dto) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: dto.studentId },
            include: { user: { select: { fullName: true } } },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student [${dto.studentId}] not found`);
        }
        let amountExpected = dto.amountExpected;
        let groupName = 'عام';
        if (dto.groupId) {
            const group = await this.prisma.academicGroup.findUnique({
                where: { id: dto.groupId },
            });
            if (!group) {
                throw new common_1.NotFoundException(`Academic group [${dto.groupId}] not found`);
            }
            if (user.role === client_1.UserRole.TEACHER) {
                const teacherId = user.teacherProfileId || user.id;
                if (group.teacherId !== teacherId && group.teacherId !== user.id) {
                    throw new common_1.ForbiddenException('You do not own the academic group for this payment');
                }
            }
            const enrollment = await this.prisma.groupEnrollment.findUnique({
                where: {
                    groupId_studentId: {
                        groupId: dto.groupId,
                        studentId: dto.studentId,
                    },
                },
            });
            if (!enrollment || enrollment.status !== client_1.GroupEnrollmentStatus.ACTIVE) {
                throw new common_1.BadRequestException('Student is not actively enrolled in this academic group');
            }
            groupName = group.name;
            if (amountExpected === undefined) {
                amountExpected = Number(group.monthlyFee);
            }
        }
        const payment = await this.prisma.studentPaymentRecord.upsert({
            where: {
                studentId_groupId_periodYear_periodMonth: {
                    studentId: dto.studentId,
                    groupId: dto.groupId ?? null,
                    periodYear: dto.periodYear,
                    periodMonth: dto.periodMonth,
                },
            },
            create: {
                studentId: dto.studentId,
                groupId: dto.groupId,
                periodYear: dto.periodYear,
                periodMonth: dto.periodMonth,
                amountExpected: amountExpected ?? 0,
                amountPaid: dto.amountPaid,
                currency: 'EGP',
                paymentStatus: dto.paymentStatus || client_1.PaymentStatus.PAID,
                paymentMethod: dto.paymentMethod || 'CASH',
                receiptNumber: dto.receiptNumber,
                notes: dto.notes,
                recordedById: user.id,
            },
            update: {
                amountPaid: dto.amountPaid,
                ...(amountExpected !== undefined ? { amountExpected } : {}),
                paymentStatus: dto.paymentStatus || client_1.PaymentStatus.PAID,
                paymentMethod: dto.paymentMethod || 'CASH',
                receiptNumber: dto.receiptNumber,
                notes: dto.notes,
                recordedById: user.id,
            },
            include: {
                student: {
                    include: { user: { select: { fullName: true, phone: true } }, parentLinks: true },
                },
                group: { select: { id: true, name: true } },
            },
        });
        if (payment.paymentStatus === client_1.PaymentStatus.PAID) {
            this.eventEmitter.emit('payment.recorded', {
                studentId: dto.studentId,
                studentName: student.user.fullName,
                groupId: dto.groupId,
                groupName,
                amountPaid: Number(payment.amountPaid),
                periodYear: dto.periodYear,
                periodMonth: dto.periodMonth,
            });
        }
        this.logger.log(`Payment recorded: Student [${dto.studentId}], Period ${dto.periodMonth}/${dto.periodYear}, Paid: ${dto.amountPaid} EGP`);
        return payment;
    }
    async getPaymentLog(query, user) {
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(query.limit);
        const decodedCursor = query.cursor
            ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(query.cursor)
            : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
        const where = {
            ...(query.studentId ? { studentId: query.studentId } : {}),
            ...(query.groupId ? { groupId: query.groupId } : {}),
            ...(query.periodYear ? { periodYear: query.periodYear } : {}),
            ...(query.periodMonth ? { periodMonth: query.periodMonth } : {}),
            ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
            ...(cursorFilter || {}),
        };
        if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            where.group = {
                OR: [
                    { teacherId },
                    { teacher: { id: teacherId } },
                ],
            };
        }
        const payments = await this.prisma.studentPaymentRecord.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            include: {
                student: {
                    include: { user: { select: { id: true, fullName: true, phone: true } } },
                },
                group: { select: { id: true, name: true } },
                recordedBy: { select: { id: true, fullName: true } },
            },
        });
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(payments, limit);
    }
    async getStudentPaymentHistory(studentId, user) {
        if (user.role === client_1.UserRole.STUDENT) {
            const myStudentId = user.studentProfileId || user.id;
            if (myStudentId !== studentId) {
                throw new common_1.ForbiddenException('Students can only access their own payment history');
            }
        }
        else if (user.role === client_1.UserRole.PARENT) {
            const parentId = user.parentProfileId || user.id;
            const link = await this.prisma.parentStudentLink.findUnique({
                where: {
                    parentId_studentId: {
                        parentId,
                        studentId,
                    },
                },
            });
            if (!link) {
                throw new common_1.ForbiddenException('Guardians can only view linked children payment history');
            }
        }
        else if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            const enrolledInTeacherGroup = await this.prisma.groupEnrollment.findFirst({
                where: {
                    studentId,
                    status: client_1.GroupEnrollmentStatus.ACTIVE,
                    group: {
                        OR: [
                            { teacherId },
                            { teacher: { id: teacherId } },
                        ],
                    },
                },
            });
            if (!enrolledInTeacherGroup) {
                throw new common_1.ForbiddenException('Student is not enrolled in your academic groups');
            }
        }
        const records = await this.prisma.studentPaymentRecord.findMany({
            where: { studentId },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            include: {
                group: { select: { id: true, name: true } },
                recordedBy: { select: { fullName: true } },
            },
        });
        return records.map((r) => ({
            ...r,
            amountExpected: Number(r.amountExpected),
            amountPaid: Number(r.amountPaid),
        }));
    }
    async getGroupDefaulters(groupId, periodYear, periodMonth, user) {
        const group = await this.prisma.academicGroup.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Academic group [${groupId}] not found`);
        }
        if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            if (group.teacherId !== teacherId && group.teacherId !== user.id) {
                throw new common_1.ForbiddenException('You do not own this academic group');
            }
        }
        const enrollments = await this.prisma.groupEnrollment.findMany({
            where: { groupId, status: client_1.GroupEnrollmentStatus.ACTIVE },
            include: {
                student: {
                    include: {
                        user: { select: { id: true, fullName: true, phone: true } },
                        parentLinks: {
                            include: {
                                parent: {
                                    include: { user: { select: { fullName: true, phone: true } } },
                                },
                            },
                        },
                    },
                },
            },
        });
        const paidRecords = await this.prisma.studentPaymentRecord.findMany({
            where: {
                groupId,
                periodYear,
                periodMonth,
                paymentStatus: client_1.PaymentStatus.PAID,
            },
            select: { studentId: true },
        });
        const paidStudentIds = new Set(paidRecords.map((r) => r.studentId));
        const defaulters = enrollments
            .filter((e) => !paidStudentIds.has(e.studentId))
            .map((e) => ({
            studentId: e.student.id,
            studentCode: e.student.studentCode,
            fullName: e.student.user.fullName,
            phone: e.student.user.phone,
            gradeLevel: e.student.gradeLevel,
            monthlyFeeExpected: Number(group.monthlyFee),
            parentName: e.student.parentLinks[0]?.parent.user.fullName || null,
            parentPhone: e.student.parentLinks[0]?.parent.user.phone || null,
        }));
        return {
            groupId: group.id,
            groupName: group.name,
            periodYear,
            periodMonth,
            totalEnrolled: enrollments.length,
            totalDefaulters: defaulters.length,
            defaulters,
        };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map