import type { ApiSuccess, ApiError } from '~/types/api/common'

export const apiSuccess = <T>(data: T, meta?: Record<string, any>): ApiSuccess<T> => ({
  success: true as const,
  data,
  ...(meta && { meta }),
})

export const apiError = (code: string, message: string): ApiError => ({
  success: false as const,
  error: { code, message },
})
