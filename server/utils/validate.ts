import { createError } from 'h3'
import { ErrorCodes } from './errors'

export const requireFields = (body: Record<string, any>, fields: string[]) => {
  const missing = fields.filter(f => !body[f])
  if (missing.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${ErrorCodes.MISSING_REQUIRED_FIELDS}: Missing required fields: ${missing.join(', ')}`,
    })
  }
}
