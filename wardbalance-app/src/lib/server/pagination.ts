export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export const DEFAULT_LIMIT = 200;
export const MAX_LIMIT = 500;

export function parsePagination(
  searchParams: URLSearchParams,
  overrides?: { defaultLimit?: number; maxLimit?: number }
): { limit: number; offset: number } {
  const parsedLimit = parseInt(searchParams.get("limit") || "", 10);
  const defaultLimit = overrides?.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = overrides?.maxLimit ?? MAX_LIMIT;
  const limit = isNaN(parsedLimit) ? defaultLimit : Math.min(parsedLimit, maxLimit);

  const parsedOffset = parseInt(searchParams.get("offset") || "", 10);
  const offset = isNaN(parsedOffset) ? 0 : Math.max(parsedOffset, 0);

  return { limit, offset };
}


export function createPaginationMeta(
  total: number,
  limit: number,
  offset: number
): PaginationMeta {
  return { total, limit, offset };
}

export function paginatedJsonResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  return { data, meta: createPaginationMeta(total, limit, offset) };
}
