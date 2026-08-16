export interface CursorPaginationParams {
    cursor?: string | null;
    limit?: number;
    direction?: 'forward' | 'backward';
}
export interface DecodedCursor {
    createdAt: Date;
    id: string;
}
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        nextCursor: string | null;
        prevCursor: string | null;
        hasMore: boolean;
        limit: number;
    };
}
export declare class CursorPaginationHelper {
    private static readonly DEFAULT_LIMIT;
    private static readonly MAX_LIMIT;
    static encodeCursor(createdAt: Date | string, id: string): string;
    static decodeCursor(cursor: string): DecodedCursor | null;
    static sanitizeLimit(limit?: number): number;
    static buildPrismaWhereClause(cursor: DecodedCursor | null, direction?: 'DESC' | 'ASC'): Record<string, any> | undefined;
    static formatResponse<T extends {
        id: string;
        createdAt: Date;
    }>(items: T[], requestedLimit: number): PaginatedResult<T>;
}
