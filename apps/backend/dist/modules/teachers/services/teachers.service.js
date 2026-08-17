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
var TeachersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
let TeachersService = TeachersService_1 = class TeachersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TeachersService_1.name);
    }
    async getDashboardOverview(teacherId, query) {
        const isSpecificGroup = query.groupId && query.groupId !== 'ALL';
        const groupWhere = { teacherId, isActive: true };
        if (isSpecificGroup) {
            groupWhere.id = query.groupId;
        }
        const teacherGroups = await this.prisma.academicGroup.findMany({
            where: groupWhere,
            include: {
                schedules: { orderBy: { dayOfWeek: 'asc' } },
                enrollments: {
                    where: { status: client_1.GroupEnrollmentStatus.ACTIVE },
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, fullName: true, phone: true } },
                                parentLinks: {
                                    include: {
                                        parent: {
                                            include: {
                                                user: { select: { phone: true, fullName: true } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const groupIds = teacherGroups.map((g) => g.id);
        const activeStudentIds = new Set();
        teacherGroups.forEach((g) => {
            g.enrollments.forEach((e) => activeStudentIds.add(e.studentId));
        });
        const totalActiveStudents = activeStudentIds.size;
        const totalActiveGroups = teacherGroups.length;
        const now = new Date();
        const todayDayOfWeek = now.getDay();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const existingTodaySessions = await this.prisma.lessonSession.findMany({
            where: {
                groupId: { in: groupIds },
                sessionDate: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
            include: {
                group: { select: { id: true, name: true, gradeLevel: true } },
                schedule: true,
                attendanceRecords: true,
            },
        });
        const todaySessionItems = [];
        const processedGroupSchedule = new Set();
        for (const session of existingTodaySessions) {
            processedGroupSchedule.add(session.groupId);
            const enrolledCount = teacherGroups.find((g) => g.id === session.groupId)?.enrollments.length || 0;
            const presentCount = session.attendanceRecords.filter((r) => r.status === client_1.AttendanceStatus.PRESENT).length;
            const startTime = session.startTime || session.schedule?.startTime || '17:00';
            const endTime = session.schedule?.endTime || '19:00';
            let status = 'UPCOMING';
            if (session.attendanceRecords.length > 0) {
                status = 'COMPLETED';
            }
            todaySessionItems.push({
                id: session.id,
                groupId: session.groupId,
                groupName: session.group.name,
                gradeLevel: session.group.gradeLevel,
                startTime,
                endTime,
                roomLocation: session.schedule?.location || 'قاعة 1',
                status,
                enrolledCount,
                presentCount,
                sessionDate: session.sessionDate.toISOString().split('T')[0],
            });
        }
        for (const group of teacherGroups) {
            if (processedGroupSchedule.has(group.id))
                continue;
            const todaySchedule = group.schedules.find((s) => s.dayOfWeek === todayDayOfWeek);
            if (todaySchedule) {
                todaySessionItems.push({
                    id: `sched-${todaySchedule.id}`,
                    groupId: group.id,
                    groupName: group.name,
                    gradeLevel: group.gradeLevel,
                    startTime: todaySchedule.startTime,
                    endTime: todaySchedule.endTime,
                    roomLocation: todaySchedule.location || 'قاعة 1',
                    status: 'UPCOMING',
                    enrolledCount: group.enrollments.length,
                    presentCount: 0,
                    sessionDate: now.toISOString().split('T')[0],
                });
            }
        }
        const todaySessionsCount = todaySessionItems.length;
        const activeSessionsCount = todaySessionItems.filter((s) => s.status === 'IN_PROGRESS').length;
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentAttendanceRecords = await this.prisma.attendanceRecord.findMany({
            where: {
                session: {
                    groupId: { in: groupIds },
                    sessionDate: { gte: sevenDaysAgo },
                },
            },
        });
        const totalRecentRecords = recentAttendanceRecords.length;
        const totalRecentPresent = recentAttendanceRecords.filter((r) => r.status === client_1.AttendanceStatus.PRESENT).length;
        const weeklyAttendanceRate = totalRecentRecords > 0
            ? Math.round((totalRecentPresent / totalRecentRecords) * 100 * 10) / 10
            : 95.0;
        const attendanceTrends = [
            { period: 'الأسبوع 1', rate: 92.0, dateLabel: '1 - 7 أغسطس' },
            { period: 'الأسبوع 2', rate: 94.5, dateLabel: '8 - 14 أغسطس' },
            { period: 'الأسبوع 3', rate: 91.8, dateLabel: '15 - 21 أغسطس' },
            { period: 'هذا الأسبوع', rate: weeklyAttendanceRate, dateLabel: 'الحالي' },
        ];
        const pendingSubmissions = await this.prisma.assessmentSubmission.findMany({
            where: {
                assessment: {
                    teacherId,
                    ...(isSpecificGroup ? { groupId: query.groupId } : {}),
                },
                status: client_1.SubmissionStatus.SUBMITTED,
            },
            include: {
                assessment: {
                    include: {
                        group: { select: { name: true } },
                    },
                },
            },
        });
        const pendingGradingCount = pendingSubmissions.length;
        const pendingAssessmentsMap = new Map();
        for (const sub of pendingSubmissions) {
            const a = sub.assessment;
            const existing = pendingAssessmentsMap.get(a.id);
            const daysPending = Math.max(1, Math.floor((now.getTime() - sub.submittedAt.getTime()) / (1000 * 60 * 60 * 24)));
            if (existing) {
                existing.pendingCount += 1;
            }
            else {
                pendingAssessmentsMap.set(a.id, {
                    assessmentId: a.id,
                    assessmentTitle: a.title,
                    groupName: a.group?.name || 'عام',
                    pendingCount: 1,
                    dueDate: a.dueDate?.toISOString(),
                    daysPending,
                });
            }
        }
        const pendingGradingList = Array.from(pendingAssessmentsMap.values());
        const pendingGradingAssessmentsCount = pendingGradingList.length;
        const atRiskStudents = [];
        const allRecentAbsences = await this.prisma.attendanceRecord.findMany({
            where: {
                session: { groupId: { in: groupIds } },
                status: client_1.AttendanceStatus.ABSENT,
            },
            include: {
                student: {
                    include: {
                        user: { select: { fullName: true, phone: true } },
                        parentLinks: {
                            include: { parent: { include: { user: { select: { phone: true } } } } },
                        },
                    },
                },
                session: {
                    include: { group: { select: { id: true, name: true } } },
                },
            },
            orderBy: { recordedAt: 'desc' },
            take: 50,
        });
        const studentAbsenceMap = new Map();
        for (const rec of allRecentAbsences) {
            if (!studentAbsenceMap.has(rec.studentId)) {
                studentAbsenceMap.set(rec.studentId, {
                    id: rec.id,
                    studentId: rec.studentId,
                    studentName: rec.student.user.fullName,
                    groupId: rec.session.group.id,
                    groupName: rec.session.group.name,
                    consecutiveAbsences: 1,
                    lastAttendedDate: rec.recordedAt.toISOString().split('T')[0],
                    parentPhone: rec.student.emergencyPhone ||
                        rec.student.parentLinks[0]?.parent.user.phone ||
                        rec.student.user.phone,
                });
            }
            else {
                const item = studentAbsenceMap.get(rec.studentId);
                item.consecutiveAbsences += 1;
            }
        }
        atRiskStudents.push(...Array.from(studentAbsenceMap.values()).slice(0, 5));
        const groupPerformance = await Promise.all(teacherGroups.map(async (group) => {
            const totalGroupSessions = await this.prisma.lessonSession.count({
                where: { groupId: group.id },
            });
            const totalGroupPresent = await this.prisma.attendanceRecord.count({
                where: {
                    session: { groupId: group.id },
                    status: client_1.AttendanceStatus.PRESENT,
                },
            });
            const totalAttendanceSlots = totalGroupSessions * (group.enrollments.length || 1);
            const attendanceRate = totalAttendanceSlots > 0
                ? Math.min(100, Math.round((totalGroupPresent / totalAttendanceSlots) * 100))
                : 96;
            return {
                groupId: group.id,
                groupName: group.name,
                gradeLevel: group.gradeLevel,
                enrolledCount: group.enrollments.length,
                attendanceRate,
                averageExamScore: 88.0,
            };
        }));
        return {
            kpis: {
                todaySessionsCount,
                activeSessionsCount,
                totalActiveStudents,
                totalActiveGroups,
                weeklyAttendanceRate,
                attendanceRateDelta: 2.1,
                pendingGradingCount,
                pendingGradingAssessmentsCount,
            },
            todaySessions: todaySessionItems,
            attendanceTrends,
            atRiskStudents,
            pendingGradingList,
            groupPerformance,
            lastUpdatedTimestamp: new Date().toISOString(),
        };
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = TeachersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map