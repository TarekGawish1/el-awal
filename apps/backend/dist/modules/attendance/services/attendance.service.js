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
var AttendanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../core/database/prisma.service");
const attendance_repository_1 = require("../repositories/attendance.repository");
const client_1 = require("@prisma/client");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    constructor(prisma, attendanceRepository, eventEmitter) {
        this.prisma = prisma;
        this.attendanceRepository = attendanceRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(AttendanceService_1.name);
    }
    async processQrScan(sessionId, qrCodeToken, user) {
        const session = await this.prisma.lessonSession.findUnique({
            where: { id: sessionId },
            include: {
                group: {
                    include: {
                        _count: {
                            select: { enrollments: { where: { status: client_1.GroupEnrollmentStatus.ACTIVE } } },
                        },
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Lesson session [${sessionId}] not found`);
        }
        if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
                throw new common_1.ForbiddenException('You do not own the academic group for this session');
            }
        }
        const student = await this.prisma.studentProfile.findUnique({
            where: { qrCodeToken },
            include: { user: { select: { fullName: true, isActive: true } } },
        });
        if (!student || !student.user.isActive) {
            throw new common_1.BadRequestException('Invalid QR credential or inactive student account');
        }
        const enrollment = await this.prisma.groupEnrollment.findUnique({
            where: {
                groupId_studentId: {
                    groupId: session.groupId,
                    studentId: student.id,
                },
            },
        });
        if (!enrollment || enrollment.status !== client_1.GroupEnrollmentStatus.ACTIVE) {
            throw new common_1.BadRequestException(`Student [${student.user.fullName}] is not actively enrolled in group [${session.group.name}]`);
        }
        const result = await this.attendanceRepository.recordQrScan(session.id, student.id, user.id);
        if (!result.isDuplicate) {
            this.eventEmitter.emit('attendance.recorded', {
                sessionId: session.id,
                studentId: student.id,
                status: client_1.AttendanceStatus.PRESENT,
            });
        }
        const totalPresent = await this.prisma.attendanceRecord.count({
            where: { sessionId, status: client_1.AttendanceStatus.PRESENT },
        });
        return {
            isDuplicate: result.isDuplicate,
            student: {
                id: student.id,
                fullName: student.user.fullName,
                studentCode: student.studentCode,
            },
            attendance: result.record,
            sessionStats: {
                totalPresent,
                totalEnrolled: session.group._count.enrollments,
            },
        };
    }
    async recordManualBatch(sessionId, dto, user) {
        const session = await this.prisma.lessonSession.findUnique({
            where: { id: sessionId },
            include: { group: true },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Lesson session [${sessionId}] not found`);
        }
        if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
                throw new common_1.ForbiddenException('You do not own the academic group for this session');
            }
        }
        const studentIds = dto.records.map((r) => r.studentId);
        const activeEnrollments = await this.prisma.groupEnrollment.findMany({
            where: {
                groupId: session.groupId,
                studentId: { in: studentIds },
                status: client_1.GroupEnrollmentStatus.ACTIVE,
            },
            select: { studentId: true },
        });
        const enrolledSet = new Set(activeEnrollments.map((e) => e.studentId));
        const nonEnrolled = studentIds.filter((id) => !enrolledSet.has(id));
        if (nonEnrolled.length > 0) {
            throw new common_1.BadRequestException(`Cannot record attendance for non-enrolled students: ${nonEnrolled.join(', ')}`);
        }
        const updatedRecords = [];
        await this.prisma.$transaction(async (tx) => {
            for (const item of dto.records) {
                const record = await tx.attendanceRecord.upsert({
                    where: {
                        sessionId_studentId: {
                            sessionId,
                            studentId: item.studentId,
                        },
                    },
                    create: {
                        sessionId,
                        studentId: item.studentId,
                        status: item.status,
                        recordingMethod: client_1.RecordingMethod.MANUAL,
                        recordedById: user.id,
                        notes: item.notes,
                        recordedAt: new Date(),
                    },
                    update: {
                        status: item.status,
                        recordingMethod: client_1.RecordingMethod.MANUAL,
                        recordedById: user.id,
                        notes: item.notes,
                    },
                });
                updatedRecords.push(record);
                if (item.status === client_1.AttendanceStatus.ABSENT) {
                    this.eventEmitter.emit('student.absence.recorded', {
                        studentId: item.studentId,
                        groupName: session.group.name,
                        date: session.sessionDate,
                    });
                }
            }
        });
        const [presentCount, absentCount, excusedCount, totalEnrolled] = await Promise.all([
            this.prisma.attendanceRecord.count({ where: { sessionId, status: client_1.AttendanceStatus.PRESENT } }),
            this.prisma.attendanceRecord.count({ where: { sessionId, status: client_1.AttendanceStatus.ABSENT } }),
            this.prisma.attendanceRecord.count({ where: { sessionId, status: client_1.AttendanceStatus.EXCUSED } }),
            this.prisma.groupEnrollment.count({
                where: { groupId: session.groupId, status: client_1.GroupEnrollmentStatus.ACTIVE },
            }),
        ]);
        return {
            sessionId,
            updatedCount: updatedRecords.length,
            sessionStats: {
                totalPresent: presentCount,
                totalAbsent: absentCount,
                totalExcused: excusedCount,
                totalEnrolled,
            },
        };
    }
    async getSessionReport(sessionId, user) {
        const session = await this.prisma.lessonSession.findUnique({
            where: { id: sessionId },
            include: {
                group: {
                    include: {
                        enrollments: {
                            where: { status: client_1.GroupEnrollmentStatus.ACTIVE },
                            include: {
                                student: {
                                    include: {
                                        user: { select: { id: true, fullName: true, phone: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                attendanceRecords: {
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, fullName: true, phone: true } },
                            },
                        },
                        recordedBy: { select: { id: true, fullName: true } },
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException(`Lesson session [${sessionId}] not found`);
        }
        if (user.role === client_1.UserRole.TEACHER) {
            const teacherId = user.teacherProfileId || user.id;
            if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
                throw new common_1.ForbiddenException('You do not own the academic group for this session');
            }
        }
        const totalEnrolled = session.group.enrollments.length;
        const presentCount = session.attendanceRecords.filter((r) => r.status === client_1.AttendanceStatus.PRESENT).length;
        const absentCount = session.attendanceRecords.filter((r) => r.status === client_1.AttendanceStatus.ABSENT).length;
        const excusedCount = session.attendanceRecords.filter((r) => r.status === client_1.AttendanceStatus.EXCUSED).length;
        const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;
        return {
            sessionId: session.id,
            sessionDate: session.sessionDate,
            topic: session.topic,
            groupId: session.groupId,
            groupName: session.group.name,
            metrics: {
                totalEnrolled,
                presentCount,
                absentCount,
                excusedCount,
                attendanceRatePercentage: attendanceRate,
            },
            records: session.attendanceRecords.map((r) => ({
                id: r.id,
                studentId: r.studentId,
                studentCode: r.student.studentCode,
                fullName: r.student.user.fullName,
                phone: r.student.user.phone,
                status: r.status,
                recordingMethod: r.recordingMethod,
                recordedAt: r.recordedAt,
                recordedBy: r.recordedBy.fullName,
                notes: r.notes,
            })),
        };
    }
    async getStudentHistory(studentId, pagination, status, user) {
        if (user) {
            if (user.role === client_1.UserRole.STUDENT) {
                const myStudentId = user.studentProfileId || user.id;
                if (myStudentId !== studentId) {
                    throw new common_1.ForbiddenException('Students can only access their own attendance history');
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
                    throw new common_1.ForbiddenException('Guardians can only view linked children attendance history');
                }
            }
        }
        return this.attendanceRepository.getStudentAttendanceHistory(studentId, {
            cursor: pagination.cursor,
            limit: pagination.limit,
            direction: pagination.direction,
        }, status);
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_repository_1.AttendanceRepository,
        event_emitter_1.EventEmitter2])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map