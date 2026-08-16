"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorPaginationHelper = void 0;
class CursorPaginationHelper {
    static encodeCursor(createdAt, id) {
        const dateStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
        const payload = JSON.stringify({ createdAt: dateStr, id });
        return Buffer.from(payload, 'utf8').toString('base64url');
    }
    static decodeCursor(cursor) {
        try {
            const decodedStr = Buffer.from(cursor, 'base64url').toString('utf8');
            const parsed = JSON.parse(decodedStr);
            if (!parsed.createdAt || !parsed.id) {
                return null;
            }
            return {
                createdAt: new Date(parsed.createdAt),
                id: parsed.id,
            };
        }
        catch {
            return null;
        }
    }
    static sanitizeLimit(limit) {
        if (!limit || limit <= 0)
            return this.DEFAULT_LIMIT;
        return Math.min(limit, this.MAX_LIMIT);
    }
    static buildPrismaWhereClause(cursor, direction = 'DESC') {
        if (!cursor)
            return undefined;
        if (direction === 'DESC') {
            return {
                OR: [
                    { createdAt: { lt: cursor.createdAt } },
                    {
                        AND: [
                            { createdAt: cursor.createdAt },
                            { id: { lt: cursor.id } },
                        ],
                    },
                ],
            };
        }
        else {
            return {
                OR: [
                    { createdAt: { gt: cursor.createdAt } },
                    {
                        AND: [
                            { createdAt: cursor.createdAt },
                            { id: { gt: cursor.id } },
                        ],
                    },
                ],
            };
        }
    }
    static formatResponse(items, requestedLimit) {
        const hasMore = items.length > requestedLimit;
        const data = hasMore ? items.slice(0, requestedLimit) : items;
        let nextCursor = null;
        let prevCursor = null;
        if (data.length > 0) {
            const lastItem = data[data.length - 1];
            const firstItem = data[0];
            if (hasMore) {
                nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
            }
            prevCursor = this.encodeCursor(firstItem.createdAt, firstItem.id);
        }
        return {
            data,
            meta: {
                nextCursor,
                prevCursor,
                hasMore,
                limit: requestedLimit,
            },
        };
    }
}
exports.CursorPaginationHelper = CursorPaginationHelper;
CursorPaginationHelper.DEFAULT_LIMIT = 20;
CursorPaginationHelper.MAX_LIMIT = 100;
//# sourceMappingURL=cursor-pagination.helper.js.map