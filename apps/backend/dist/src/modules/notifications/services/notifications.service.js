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
    async getUnreadNotifications(recipientId) {
        return this.prisma.notification.findMany({
            where: { recipientId, isRead: false },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async markAsRead(notificationId, recipientId) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, recipientId },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async handleStudentAbsenceEvent(payload) {
        this.logger.log(`Handling asynchronous absence event for student [${payload.studentId}]`);
        const links = await this.prisma.parentStudentLink.findMany({
            where: { studentId: payload.studentId },
            include: { parent: true },
        });
        for (const link of links) {
            await this.createNotification({
                recipientId: link.parent.id,
                type: 'STUDENT_ABSENCE',
                title: 'تنبيه غياب الطالب',
                message: `تم تسجيل غياب الطالب في حصة ${payload.groupName} بتاريخ ${payload.date.toISOString().split('T')[0]}`,
                referenceEntityId: payload.studentId,
            });
        }
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, event_emitter_1.OnEvent)('student.absence.recorded', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "handleStudentAbsenceEvent", null);
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map