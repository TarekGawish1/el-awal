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
var AttendanceRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/database/prisma.service");
const cursor_pagination_helper_1 = require("../../../common/pagination/cursor-pagination.helper");
let AttendanceRepository = AttendanceRepository_1 = class AttendanceRepository {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AttendanceRepository_1.name);
    }
    async recordQrScan(sessionId, studentId, recordedById) {
        const insertedRows = await this.prisma.$queryRaw `
      INSERT INTO "attendance_records" (
        "id",
        "session_id",
        "student_id",
        "status",
        "recording_method",
        "recorded_by_id",
        "recorded_at"
      ) VALUES (
        gen_random_uuid(),
        ${sessionId}::uuid,
        ${studentId}::uuid,
        'PRESENT'::"attendance_status",
        'QR_SCAN'::"recording_method",
        ${recordedById}::uuid,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("session_id", "student_id") DO NOTHING
      RETURNING *;
    `;
        if (insertedRows && insertedRows.length > 0) {
            return {
                record: insertedRows[0],
                isDuplicate: false,
            };
        }
        const existingRecord = await this.prisma.attendanceRecord.findUniqueOrThrow({
            where: {
                sessionId_studentId: {
                    sessionId,
                    studentId,
                },
            },
        });
        this.logger.debug(`Idempotent QR Scan: student ${studentId} was already marked ${existingRecord.status} for session ${sessionId}`);
        return {
            record: existingRecord,
            isDuplicate: true,
        };
    }
    async getStudentAttendanceHistory(studentId, params, statusFilter) {
        const limit = cursor_pagination_helper_1.CursorPaginationHelper.sanitizeLimit(params.limit);
        const decodedCursor = params.cursor ? cursor_pagination_helper_1.CursorPaginationHelper.decodeCursor(params.cursor) : null;
        const cursorFilter = cursor_pagination_helper_1.CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');
        const records = await this.prisma.attendanceRecord.findMany({
            where: {
                studentId,
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(cursorFilter || {}),
            },
            orderBy: [
                { recordedAt: 'desc' },
                { id: 'desc' },
            ],
            take: limit + 1,
            include: {
                session: {
                    select: {
                        sessionDate: true,
                        topic: true,
                        group: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        return cursor_pagination_helper_1.CursorPaginationHelper.formatResponse(records.map((r) => ({ ...r, createdAt: r.recordedAt })), limit);
    }
};
exports.AttendanceRepository = AttendanceRepository;
exports.AttendanceRepository = AttendanceRepository = AttendanceRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceRepository);
//# sourceMappingURL=attendance.repository.js.map