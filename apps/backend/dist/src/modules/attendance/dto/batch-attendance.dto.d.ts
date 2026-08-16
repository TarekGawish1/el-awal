import { AttendanceStatus } from '@prisma/client';
export declare class AttendanceItemDto {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
}
export declare class BatchAttendanceDto {
    records: AttendanceItemDto[];
}
