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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../core/database/prisma.service");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
const client_1 = require("@prisma/client");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async createNotification(dto) {
        return this.prisma.notification.create({
            data: {
                recipientId: dto.recipientId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                referenceEntityId: dto.referenceEntityId,
            },
        });
    }
    async getNotifications(recipientId, query) {
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(query.limit);
        const decodedCursor = query.cursor
            ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(query.cursor)
            : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
        const notifications = await this.prisma.notification.findMany({
            where: {
                recipientId,
                ...(cursorFilter || {}),
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
        });
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(notifications, limit);
    }
    async getUnreadCount(recipientId) {
        const count = await this.prisma.notification.count({
            where: { recipientId, isRead: false },
        });
        return { unreadCount: count };
    }
    async markAsRead(notificationId, recipientId) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, recipientId },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async markAllAsRead(recipientId) {
        const result = await this.prisma.notification.updateMany({
            where: { recipientId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return { markedCount: result.count };
    }
    async handleAbsenceEvent(payload) {
        if (payload.status && payload.status !== client_1.AttendanceStatus.ABSENT) {
            return;
        }
        this.logger.log(`Processing absence notification event for student [${payload.studentId}]`);
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: payload.studentId },
            include: {
                user: { select: { fullName: true } },
                parentLinks: { select: { parentId: true } },
            },
        });
        if (!student || student.parentLinks.length === 0)
            return;
        const studentName = student.user.fullName;
        const dateStr = (payload.date || new Date()).toISOString().split('T')[0];
        const groupText = payload.groupName ? `في ${payload.groupName}` : '';
        for (const link of student.parentLinks) {
            await this.createNotification({
                recipientId: link.parentId,
                type: 'STUDENT_ABSENCE',
                title: 'تنبيه غياب الطالب',
                message: `نود إحاطتكم بغياب الطالب (${studentName}) ${groupText} بتاريخ ${dateStr}. يرجى المتابعة مع الإدارة.`,
                referenceEntityId: payload.studentId,
            });
        }
    }
    async handleAssessmentGradedEvent(payload) {
        this.logger.log(`Processing assessment graded notification event for submission [${payload.submissionId}]`);
        const [assessment, student] = await Promise.all([
            this.prisma.assessment.findUnique({
                where: { id: payload.assessmentId },
                select: { title: true, totalScore: true },
            }),
            this.prisma.studentProfile.findUnique({
                where: { id: payload.studentId },
                include: {
                    user: { select: { fullName: true } },
                    parentLinks: { select: { parentId: true } },
                },
            }),
        ]);
        if (!assessment || !student)
            return;
        const scoreDisplay = payload.scoreObtained !== null
            ? `${payload.scoreObtained}/${Number(assessment.totalScore)}`
            : 'تم التصحيح';
        const message = `تم رصد درجات (${assessment.title}) للطالب ${student.user.fullName}. النتيجة: ${scoreDisplay}`;
        await this.createNotification({
            recipientId: student.id,
            type: 'ASSESSMENT_GRADED',
            title: 'تم رصد درجات الاختبار',
            message,
            referenceEntityId: payload.assessmentId,
        });
        for (const link of student.parentLinks) {
            await this.createNotification({
                recipientId: link.parentId,
                type: 'ASSESSMENT_GRADED',
                title: 'تم رصد درجات الاختبار للطالب',
                message,
                referenceEntityId: payload.assessmentId,
            });
        }
    }
    async handlePaymentRecordedEvent(payload) {
        this.logger.log(`Processing payment recorded notification event for student [${payload.studentId}]`);
        const links = await this.prisma.parentStudentLink.findMany({
            where: { studentId: payload.studentId },
            select: { parentId: true },
        });
        const message = `تم تأكيد استلام مصروفات شهر (${payload.periodMonth}/${payload.periodYear}) للطالب ${payload.studentName} بمبلغ ${payload.amountPaid} ج.م.`;
        for (const link of links) {
            await this.createNotification({
                recipientId: link.parentId,
                type: 'PAYMENT_RECEIVED',
                title: 'إشعار سداد المصروفات الدراسية',
                message,
                referenceEntityId: payload.studentId,
            });
        }
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, event_emitter_1.OnEvent)('student.absence.recorded', { async: true }),
    (0, event_emitter_1.OnEvent)('attendance.recorded', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleAbsenceEvent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('assessment.graded', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleAssessmentGradedEvent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.recorded', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handlePaymentRecordedEvent", null);
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map