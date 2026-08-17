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
var SchedulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
let SchedulesService = SchedulesService_1 = class SchedulesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SchedulesService_1.name);
    }
    async assertGroupAccess(groupId, user, requireTeacherOwnership = false) {
        const group = await this.prisma.academicGroup.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Academic group [${groupId}] not found`);
        }
        if (user.role === client_1.UserRole.SECRETARIAT) {
            return group;
        }
        if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            if (group.teacherId !== teacherId && group.teacherId !== user.id) {
                throw new common_1.ForbiddenException('You do not own this academic group');
            }
            return group;
        }
        if (requireTeacherOwnership) {
            throw new common_1.ForbiddenException('Only the group teacher or secretariat can perform this action');
        }
        if (user.role === client_1.UserRole.STUDENT) {
            const studentId = user.studentProfileId || user.id;
            const enrollment = await this.prisma.groupEnrollment.findUnique({
                where: {
                    groupId_studentId: {
                        groupId,
                        studentId,
                    },
                },
            });
            if (!enrollment || enrollment.status !== client_1.GroupEnrollmentStatus.ACTIVE) {
                throw new common_1.ForbiddenException('You are not enrolled in this group');
            }
            return group;
        }
        if (user.role === client_1.UserRole.PARENT) {
            const parentId = user.parentProfileId || user.id;
            const childEnrollment = await this.prisma.groupEnrollment.findFirst({
                where: {
                    groupId,
                    status: client_1.GroupEnrollmentStatus.ACTIVE,
                    student: {
                        parentLinks: {
                            some: { parentId },
                        },
                    },
                },
            });
            if (!childEnrollment) {
                throw new common_1.ForbiddenException('None of your linked children are enrolled in this group');
            }
            return group;
        }
        throw new common_1.ForbiddenException('Unauthorized access');
    }
    async createSchedule(dto, user) {
        await this.assertGroupAccess(dto.groupId, user, true);
        return this.prisma.lessonSchedule.create({
            data: {
                groupId: dto.groupId,
                dayOfWeek: dto.dayOfWeek,
                startTime: dto.startTime,
                endTime: dto.endTime,
                location: dto.location,
            },
        });
    }
    async getGroupSchedules(groupId, user) {
        await this.assertGroupAccess(groupId, user, false);
        return this.prisma.lessonSchedule.findMany({
            where: { groupId },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
    }
    async deleteSchedule(scheduleId, user) {
        const schedule = await this.prisma.lessonSchedule.findUnique({
            where: { id: scheduleId },
        });
        if (!schedule) {
            throw new common_1.NotFoundException(`Lesson schedule [${scheduleId}] not found`);
        }
        await this.assertGroupAccess(schedule.groupId, user, true);
        return this.prisma.lessonSchedule.delete({
            where: { id: scheduleId },
        });
    }
    async generateSessionsFromSchedule(groupId, dto, user) {
        const group = await this.assertGroupAccess(groupId, user, true);
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (start > end) {
            throw new common_1.BadRequestException('Start date cannot be after end date');
        }
        const groupWithSchedules = await this.prisma.academicGroup.findUnique({
            where: { id: groupId },
            include: { schedules: true },
        });
        if (!groupWithSchedules || groupWithSchedules.schedules.length === 0) {
            throw new common_1.BadRequestException(`Group [${group.name}] has no recurring schedules defined`);
        }
        const createdSessions = [];
        await this.prisma.$transaction(async (tx) => {
            const current = new Date(start);
            while (current <= end) {
                const dayOfWeek = current.getDay();
                const matchingSchedules = groupWithSchedules.schedules.filter((s) => s.dayOfWeek === dayOfWeek);
                for (const schedule of matchingSchedules) {
                    const sessionDateOnly = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
                    const existing = await tx.lessonSession.findFirst({
                        where: {
                            groupId,
                            sessionDate: sessionDateOnly,
                            startTime: schedule.startTime,
                        },
                    });
                    if (!existing) {
                        const dateStr = sessionDateOnly.toISOString().split('T')[0];
                        const topic = `${dto.topicPrefix || 'حصة'} - ${dateStr}`;
                        const session = await tx.lessonSession.create({
                            data: {
                                groupId,
                                scheduleId: schedule.id,
                                sessionDate: sessionDateOnly,
                                startTime: schedule.startTime,
                                topic,
                            },
                        });
                        createdSessions.push(session);
                    }
                }
                current.setDate(current.getDate() + 1);
            }
        });
        this.logger.log(`Generated ${createdSessions.length} sessions for group [${groupId}]`);
        return {
            groupId,
            groupName: group.name,
            generatedCount: createdSessions.length,
            sessions: createdSessions,
        };
    }
};
exports.SchedulesService = SchedulesService;
exports.SchedulesService = SchedulesService = SchedulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulesService);
//# sourceMappingURL=schedules.service.js.map