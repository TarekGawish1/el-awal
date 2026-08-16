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
var GroupsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
let GroupsService = GroupsService_1 = class GroupsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GroupsService_1.name);
    }
    async createGroup(teacherId, dto) {
        return this.prisma.academicGroup.create({
            data: {
                name: dto.name,
                gradeLevel: dto.gradeLevel,
                description: dto.description,
                maxCapacity: dto.maxCapacity || 50,
                monthlyFee: dto.monthlyFee || 0.0,
                teacherId,
            },
        });
    }
    async getTeacherGroups(teacherId) {
        return this.prisma.academicGroup.findMany({
            where: { teacherId, isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                schedules: { orderBy: { dayOfWeek: 'asc' } },
                _count: {
                    select: {
                        enrollments: { where: { status: client_1.GroupEnrollmentStatus.ACTIVE } },
                        sessions: true,
                    },
                },
            },
        });
    }
    async getGroupById(groupId) {
        const group = await this.prisma.academicGroup.findUnique({
            where: { id: groupId },
            include: {
                schedules: { orderBy: { dayOfWeek: 'asc' } },
                _count: {
                    select: {
                        enrollments: { where: { status: client_1.GroupEnrollmentStatus.ACTIVE } },
                        sessions: true,
                    },
                },
            },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Academic group [${groupId}] not found`);
        }
        return group;
    }
    async enrollStudent(groupId, studentId) {
        return this.prisma.$transaction(async (tx) => {
            const group = await tx.academicGroup.findUnique({
                where: { id: groupId },
                include: {
                    _count: {
                        select: { enrollments: { where: { status: client_1.GroupEnrollmentStatus.ACTIVE } } },
                    },
                },
            });
            if (!group || !group.isActive) {
                throw new common_1.NotFoundException(`Academic group [${groupId}] not found or inactive`);
            }
            if (group._count.enrollments >= group.maxCapacity) {
                throw new common_1.ConflictException(`Group [${group.name}] capacity has been reached (${group.maxCapacity} students)`);
            }
            const student = await tx.studentProfile.findUnique({
                where: { id: studentId },
                include: { user: { select: { isActive: true } } },
            });
            if (!student || !student.user.isActive) {
                throw new common_1.NotFoundException(`Student [${studentId}] not found or account is deactivated`);
            }
            const enrollment = await tx.groupEnrollment.upsert({
                where: {
                    groupId_studentId: {
                        groupId,
                        studentId,
                    },
                },
                create: {
                    groupId,
                    studentId,
                    status: client_1.GroupEnrollmentStatus.ACTIVE,
                    enrolledAt: new Date(),
                },
                update: {
                    status: client_1.GroupEnrollmentStatus.ACTIVE,
                    enrolledAt: new Date(),
                },
            });
            this.logger.log(`Student [${studentId}] enrolled in group [${groupId}]`);
            return enrollment;
        });
    }
    async dropStudent(groupId, studentId) {
        const enrollment = await this.prisma.groupEnrollment.findUnique({
            where: {
                groupId_studentId: {
                    groupId,
                    studentId,
                },
            },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException(`Student [${studentId}] is not enrolled in group [${groupId}]`);
        }
        return this.prisma.groupEnrollment.update({
            where: {
                groupId_studentId: {
                    groupId,
                    studentId,
                },
            },
            data: {
                status: client_1.GroupEnrollmentStatus.DROPPED,
            },
        });
    }
    async getGroupRoster(groupId) {
        const group = await this.prisma.academicGroup.findUnique({
            where: { id: groupId },
            include: {
                enrollments: {
                    where: { status: client_1.GroupEnrollmentStatus.ACTIVE },
                    orderBy: { student: { user: { fullName: 'asc' } } },
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, fullName: true, phone: true, email: true } },
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
                },
            },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Academic group [${groupId}] not found`);
        }
        const totalSessions = await this.prisma.lessonSession.count({
            where: { groupId },
        });
        const roster = await Promise.all(group.enrollments.map(async (e) => {
            const presentCount = await this.prisma.attendanceRecord.count({
                where: {
                    studentId: e.studentId,
                    session: { groupId },
                    status: client_1.AttendanceStatus.PRESENT,
                },
            });
            const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;
            return {
                enrollmentId: e.id,
                studentId: e.student.id,
                studentCode: e.student.studentCode,
                fullName: e.student.user.fullName,
                phone: e.student.user.phone,
                gradeLevel: e.student.gradeLevel,
                enrolledAt: e.enrolledAt,
                parent: e.student.parentLinks[0]?.parent.user || null,
                attendanceRate,
                totalPresent: presentCount,
                totalSessions,
            };
        }));
        return {
            groupId: group.id,
            groupName: group.name,
            totalEnrolled: roster.length,
            maxCapacity: group.maxCapacity,
            roster,
        };
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = GroupsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map