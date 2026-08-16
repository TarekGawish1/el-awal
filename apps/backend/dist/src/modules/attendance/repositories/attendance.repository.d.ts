import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRecord, AttendanceStatus } from '@prisma/client';
import { CursorPaginationParams, PaginatedResult } from '../../../common/pagination/cursor-pagination.helper';
export interface QrScanResult {
    record: AttendanceRecord;
    isDuplicate: boolean;
}
export declare class AttendanceRepository {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    recordQrScan(sessionId: string, studentId: string, recordedById: string): Promise<QrScanResult>;
    getStudentAttendanceHistory(studentId: string, params: CursorPaginationParams, statusFilter?: AttendanceStatus): Promise<PaginatedResult<AttendanceRecord>>;
}
