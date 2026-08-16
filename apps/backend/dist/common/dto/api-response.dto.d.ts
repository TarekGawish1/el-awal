export declare class PaginationMetaDto {
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasMore: boolean;
    limit: number;
    total?: number;
}
export declare class ApiResponseDto<T> {
    success: boolean;
    data: T;
    meta?: PaginationMetaDto;
    timestamp: string;
}
export declare class ApiErrorDto {
    success: boolean;
    statusCode: number;
    error: string;
    code: string;
    message: string | string[];
    timestamp: string;
    path: string;
    correlationId?: string;
}
