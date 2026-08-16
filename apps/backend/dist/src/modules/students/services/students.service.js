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
var StudentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../../core/database/prisma.service");
const client_1 = require("@prisma/client");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
let StudentsService = StudentsService_1 = class StudentsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(StudentsService_1.name);
    }
    async createStudent(dto) {
        return this.prisma.$transaction(async (tx) => {
            if (dto.phone) {
                const existingPhone = await tx.user.findUnique({ where: { phone: dto.phone } });
                if (existingPhone) {
                    throw new common_1.ConflictException(`Phone number [${dto.phone}] is already registered`);
                }
            }
            if (dto.email) {
                const existingEmail = await tx.user.findUnique({ where: { email: dto.email } });
                if (existingEmail) {
                    throw new common_1.ConflictException(`Email [${dto.email}] is already registered`);
                }
            }
            const passwordHash = await bcrypt.hash(dto.password, 10);
            const user = await tx.user.create({
                data: {
                    fullName: dto.fullName,
                    phone: dto.phone,
                    email: dto.email,
                    passwordHash,
                    role: client_1.UserRole.STUDENT,
                    isActive: true,
                },
            });
            const currentYear = new Date().getFullYear();
            const totalStudentsCount = await tx.studentProfile.count();
            const sequenceNumber = String(totalStudentsCount + 1).padStart(4, '0');
            const studentCode = `STU-${currentYear}-${sequenceNumber}`;
            const qrCodeToken = `qr_tok_${(0, crypto_1.randomUUID)().replace(/-/g, '')}`;
            const studentProfile = await tx.studentProfile.create({
                data: {
                    id: user.id,
                    studentCode,
                    qrCodeToken,
                    gradeLevel: dto.gradeLevel,
                    academicStage: dto.academicStage,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                    emergencyPhone: dto.emergencyPhone,
                },
            });
            let parentLink = null;
            if (dto.parentPhone) {
                let parentUser = await tx.user.findUnique({
                    where: { phone: dto.parentPhone },
                    include: { parentProfile: true },
                });
                if (!parentUser) {
                    const parentPasswordHash = await bcrypt.hash('Parent123!', 10);
                    parentUser = await tx.user.create({
                        data: {
                            fullName: dto.parentName || `ولي أمر ${dto.fullName}`,
                            phone: dto.parentPhone,
                            passwordHash: parentPasswordHash,
                            role: client_1.UserRole.PARENT,
                            isActive: true,
                            parentProfile: {
                                create: {
                                    relationshipType: dto.parentRelationship || 'Guardian',
                                },
                            },
                        },
                        include: { parentProfile: true },
                    });
                }
                else if (!parentUser.parentProfile) {
                    await tx.parentProfile.create({
                        data: {
                            id: parentUser.id,
                            relationshipType: dto.parentRelationship || 'Guardian',
                        },
                    });
                }
                parentLink = await tx.parentStudentLink.create({
                    data: {
                        parentId: parentUser.id,
                        studentId: studentProfile.id,
                    },
                });
            }
            let initialEnrollment = null;
            if (dto.initialGroupId) {
                const group = await tx.academicGroup.findUnique({
                    where: { id: dto.initialGroupId },
                    include: { _count: { select: { enrollments: { where: { status: client_1.GroupEnrollmentStatus.ACTIVE } } } } },
                });
                if (!group) {
                    throw new common_1.NotFoundException(`Target group [${dto.initialGroupId}] not found`);
                }
                if (group._count.enrollments >= group.maxCapacity) {
                    throw new common_1.BadRequestException(`Group [${group.name}] has reached its max capacity (${group.maxCapacity})`);
                }
                initialEnrollment = await tx.groupEnrollment.create({
                    data: {
                        groupId: dto.initialGroupId,
                        studentId: studentProfile.id,
                        status: client_1.GroupEnrollmentStatus.ACTIVE,
                    },
                });
            }
            this.logger.log(`Student created successfully: [${studentCode}] ${dto.fullName}`);
            return {
                id: studentProfile.id,
                studentCode: studentProfile.studentCode,
                fullName: user.fullName,
                phone: user.phone,
                email: user.email,
                gradeLevel: studentProfile.gradeLevel,
                academicStage: studentProfile.academicStage,
                academicStatus: studentProfile.academicStatus,
                qrCodeToken: studentProfile.qrCodeToken,
                createdAt: studentProfile.createdAt,
                hasParentLinked: !!parentLink,
                enrolledGroupId: initialEnrollment?.groupId || null,
            };
        });
    }
    async getStudentById(studentId) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: {
                user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
                parentLinks: {
                    include: {
                        parent: {
                            include: { user: { select: { id: true, fullName: true, phone: true } } },
                        },
                    },
                },
                groupEnrollments: {
                    where: { status: client_1.GroupEnrollmentStatus.ACTIVE },
                    include: {
                        group: { select: { id: true, name: true, gradeLevel: true } },
                    },
                },
            },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student [${studentId}] not found`);
        }
        return student;
    }
    async getStudentQrCode(studentId) {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: { user: { select: { fullName: true } } },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student [${studentId}] not found`);
        }
        return {
            studentId: student.id,
            studentCode: student.studentCode || 'N/A',
            fullName: student.user.fullName,
            gradeLevel: student.gradeLevel,
            qrCodeToken: student.qrCodeToken,
        };
    }
    async regenerateQrToken(studentId) {
        const newQrToken = `qr_tok_${(0, crypto_1.randomUUID)().replace(/-/g, '')}`;
        const updatedStudent = await this.prisma.studentProfile.update({
            where: { id: studentId },
            data: { qrCodeToken: newQrToken },
            include: { user: { select: { fullName: true } } },
        });
        this.logger.log(`Rotated QR code token for student [${studentId}]`);
        return {
            studentId: updatedStudent.id,
            studentCode: updatedStudent.studentCode || 'N/A',
            fullName: updatedStudent.user.fullName,
            gradeLevel: updatedStudent.gradeLevel,
            qrCodeToken: updatedStudent.qrCodeToken,
        };
    }
    async getStudents(query) {
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(query.limit);
        const decodedCursor = query.cursor ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(query.cursor) : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
        const where = {
            ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
            ...(query.academicStage ? { academicStage: query.academicStage } : {}),
            ...(query.academicStatus ? { academicStatus: query.academicStatus } : {}),
            ...(query.groupId
                ? { groupEnrollments: { some: { groupId: query.groupId, status: client_1.GroupEnrollmentStatus.ACTIVE } } }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
                        { user: { phone: { contains: query.search } } },
                        { studentCode: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(cursorFilter || {}),
        };
        const students = await this.prisma.studentProfile.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            include: {
                user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
                groupEnrollments: {
                    where: { status: client_1.GroupEnrollmentStatus.ACTIVE },
                    include: { group: { select: { id: true, name: true } } },
                },
            },
        });
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(students, limit);
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = StudentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map