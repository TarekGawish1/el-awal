import { AttendanceService } from '../services/attendance.service';
import { ScanQrDto } from '../dto/scan-qr.dto';
import { BatchAttendanceDto } from '../dto/batch-attendance.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus } from '@prisma/client';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    scanQrCode(sessionId: string, dto: ScanQrDto, user: AuthenticatedUser): Promise<{
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
            recordingMethod: import(".prisma/client").$Enums.RecordingMethod;
            recordedAt: Date;
            notes: string | null;
            recordedById: string;
            sessionId: string;
        };
        sessionStats: {
            totalPresent: number;
            totalEnrolled: number;
        };
    }>;
    recordManualBatch(sessionId: string, dto: BatchAttendanceDto, user: AuthenticatedUser): Promise<{
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
        recordingMethod: import(".prisma/client").$Enums.RecordingMethod;
        recordedAt: Date;
        notes: string | null;
        recordedById: string;
        sessionId: string;
    }>>;
}
