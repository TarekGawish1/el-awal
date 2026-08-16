// Keyset / Cursor-Based Pagination Utility
// Target: High-throughput feeds (Notifications, Attendance History, Submissions, Activity Feeds)
// Complexity: O(1) index seek vs O(N) offset degradation

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

export class CursorPaginationHelper {
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;

  /**
   * Encodes createdAt timestamp and record ID into an opaque URL-safe base64 string.
   */
  public static encodeCursor(createdAt: Date | string, id: string): string {
    const dateStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
    const payload = JSON.stringify({ createdAt: dateStr, id });
    return Buffer.from(payload, 'utf8').toString('base64url');
  }

  /**
   * Decodes an opaque base64 cursor back into structured timestamp and ID.
   */
  public static decodeCursor(cursor: string): DecodedCursor | null {
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
    } catch {
      return null;
    }
  }

  /**
   * Normalizes pagination limits within safe boundaries.
   */
  public static sanitizeLimit(limit?: number): number {
    if (!limit || limit <= 0) return this.DEFAULT_LIMIT;
    return Math.min(limit, this.MAX_LIMIT);
  }

  /**
   * Builds the WHERE predicate for Keyset pagination on (created_at, id).
   * Generates: (created_at < cursor.created_at) OR (created_at = cursor.created_at AND id < cursor.id)
   */
  public static buildPrismaWhereClause(
    cursor: DecodedCursor | null,
    direction: 'DESC' | 'ASC' = 'DESC',
  ): Record<string, any> | undefined {
    if (!cursor) return undefined;

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
    } else {
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

  /**
   * Packages retrieved items into standard PaginatedResult envelope with cursor metadata.
   */
  public static formatResponse<T extends { id: string; createdAt: Date }>(
    items: T[],
    requestedLimit: number,
  ): PaginatedResult<T> {
    const hasMore = items.length > requestedLimit;
    const data = hasMore ? items.slice(0, requestedLimit) : items;

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

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
