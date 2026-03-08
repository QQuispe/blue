import { defineEventHandler, createError } from 'h3'
import { apiError } from './response'
import { ErrorCodes } from './errors'
import { serverLogger } from './logger'

export const withErrorHandling = (handler: (event: any) => Promise<any>) => {
  return defineEventHandler(async event => {
    const start = Date.now()
    try {
      return await handler(event)
    } catch (error: any) {
      const statusCode = error.statusCode || 500
      const code = error.code || ErrorCodes.INTERNAL_ERROR
      const message =
        statusCode === 500 ? 'An unexpected error occurred' : error.message || 'Request failed'

      serverLogger.error(
        `[${code}] ${message} (status: ${statusCode}, duration: ${Date.now() - start}ms)`
      )

      throw createError({
        statusCode,
        data: apiError(code, message),
      })
    }
  })
}
