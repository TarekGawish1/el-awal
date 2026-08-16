import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { BatchAttendanceDto } from '../dto/batch-attendance.dto';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus } from '@prisma/client';
export declare class AttendanceService {
    private readonly prisma;
    private readonly attendanceRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, attendanceRepository: AttendanceRepository, eventEmitter: EventEmitter2);
    processQrScan(sessionId: string, qrCodeToken: string, recordedById: string): Promise<{
        isDuplicate: boolean;
        student: {
            id: string;
            fullName: string;
            studentCode: string;
        };
        attendance: {
            id: string;
            studentId: string;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            sessionId: string;
            recordingMethod: import(".prisma/client").$Enums.RecordingMethod;
            recordedById: string;
            recordedAt: Date;
            notes: string | null;
        };
        sessionStats: {
            totalPresent: number;
            totalEnrolled: number;
        };
    }>;
    recordManualBatch(sessionId: string, dto: BatchAttendanceDto, recordedById: string): Promise<{
        sessionId: string;
        updatedCount: number;
        sessionStats: {
            totalPresent: number;
            totalAbsent: number;
            totalExcused: number;
            totalEnrolled: number;
        };
    }>;
    getSessionReport(sessionId: string): Promise<{
        sessionId: string;
        sessionDate: Date;
        topic: string;
        groupId: string;
        groupName: string;
        metrics: {
            totalEnrolled: number;
            presentCount: number;
            absentCount: number;
            excusedCount: number;
            attendanceRatePercentage: number;
        };
        records: {
            id: string;
            studentId: string;
            studentCode: string;
            fullName: string;
            phone: string;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            recordingMethod: import(".prisma/client").$Enums.RecordingMethod;
            recordedAt: Date;
            recordedBy: string;
            notes: string;
        }[];
    }>;
    getStudentHistory(studentId: string, pagination: CursorPaginationDto, status?: AttendanceStatus): Promise<import("../../../common/pagination/cursor-pagination.helper").PaginatedResult<{
        id: string;
        studentId: string;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        sessionId: string;
        recordingMethod: import(".prisma/client").$Enums.RecordingMethod;
        recordedById: string;
        recordedAt: Date;
        notes: string | null;
    }>>;
}
