import { defineEventHandler, getRouterParam, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { lookupBarcode } from '~/server/services/health/barcode'
import type { BarcodeResponse } from '~/types/api/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<BarcodeResponse> => {
    const user = await requireAuth(event)
    const code = getRouterParam(event, 'code')

    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Barcode required',
      })
    }

    const result = await lookupBarcode(code)

    return apiSuccess(result)
  })
)
