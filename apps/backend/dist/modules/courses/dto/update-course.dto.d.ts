import { CourseStatus } from '@prisma/client';
export declare class UpdateCourseDto {
    title?: string;
    description?: string;
    subject?: string;
    gradeLevel?: string;
    academicStage?: string;
    price?: number;
    coverImageUrl?: string;
    status?: CourseStatus;
}
