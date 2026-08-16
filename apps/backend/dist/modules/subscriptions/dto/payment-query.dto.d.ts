import { PaymentStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
export declare class PaymentQueryDto extends CursorPaginationDto {
    studentId?: string;
    groupId?: string;
    periodYear?: number;
    periodMonth?: number;
    paymentStatus?: PaymentStatus;
}
