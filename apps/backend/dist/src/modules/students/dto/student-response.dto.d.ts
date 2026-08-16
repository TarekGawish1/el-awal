import { StudentAcademicStatus } from '@prisma/client';
export declare class StudentProfileResponseDto {
    id: string;
    userId: string;
    fullName: string;
    phone?: string;
    email?: string;
    studentCode?: string;
    gradeLevel: string;
    academicStage?: string;
    academicStatus: StudentAcademicStatus;
    dateOfBirth?: Date;
    emergencyPhone?: string;
    createdAt: Date;
}
