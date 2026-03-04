// src/common/http/pagination.util.ts

import { PaginationMeta } from './response';

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export function buildPaginationMeta(params: PaginationParams): PaginationMeta {
  const { page, limit, total } = params;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
  };
}
