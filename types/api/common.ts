export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: Record<string, any>
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}
