import { StudentAcademicStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
export declare class StudentQueryDto extends CursorPaginationDto {
    search?: string;
    gradeLevel?: string;
    academicStage?: string;
    groupId?: string;
    academicStatus?: StudentAcademicStatus;
}
