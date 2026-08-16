import { AssessmentType } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
export declare class AssessmentQueryDto extends CursorPaginationDto {
    groupId?: string;
    courseId?: string;
    type?: AssessmentType;
    isPublished?: boolean;
}
