// Cursor pagination, never offset. The cursor is an opaque base64url token wrapping the
// sort key of the last item seen. Repos translate {cursor, limit} into a driver query; the
// wire contract is always meta: { nextCursor: string | null, hasMore: boolean }.

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PageParams {
  cursor: string | null;
  limit: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Parse `?cursor=&limit=` from a query object into clamped, typed params.
export const parsePageParams = (query: Record<string, unknown>): PageParams => {
  const rawCursor = query['cursor'];
  const rawLimit = query['limit'];
  const cursor = typeof rawCursor === 'string' && rawCursor.length > 0 ? rawCursor : null;
  let limit = DEFAULT_LIMIT;
  if (typeof rawLimit === 'string') {
    const n = Number.parseInt(rawLimit, 10);
    if (Number.isFinite(n) && n > 0) limit = Math.min(n, MAX_LIMIT);
  }
  return { cursor, limit };
};

export const encodeCursor = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

export const decodeCursor = (cursor: string | null): string | null => {
  if (!cursor) return null;
  try {
    return Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    return null;
  }
};

// Build a Page<T> from one extra-fetched row: query for limit+1, pass the rows here.
export const buildPage = <T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): Page<T> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(cursorOf(last)) : null;
  return { items, nextCursor, hasMore };
};

export const pageMeta = <T>(page: Page<T>): Record<string, unknown> => ({
  nextCursor: page.nextCursor,
  hasMore: page.hasMore,
});
