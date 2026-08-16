import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
export declare class CourseQueryDto extends CursorPaginationDto {
    gradeLevel?: string;
    academicStage?: string;
    subject?: string;
    search?: string;
}
