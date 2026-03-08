import { getQuery } from 'h3'

export interface PaginationParams {
  limit: number
  offset: number
  page: number
}

export const getPagination = (event: any, defaultLimit = 50): PaginationParams => {
  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, parseInt(query.limit as string) || defaultLimit)
  const offset = (page - 1) * limit
  return { limit, offset, page }
}

export const paginationMeta = (total: number, params: PaginationParams) => ({
  total,
  page: params.page,
  limit: params.limit,
  totalPages: Math.ceil(total / params.limit),
})
