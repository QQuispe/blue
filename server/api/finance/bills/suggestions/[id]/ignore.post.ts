import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { pool } from '~/server/db/index'

export default defineEventHandler(async event => {
  const startTime = Date.now()

  try {
    const user = await requireAuth(event)
    const suggestionId = getRouterParam(event, 'id')

    if (!suggestionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Suggestion ID is required',
      })
    }

    // Verify suggestion belongs to user and mark as ignored
    const result = await pool.query(
      `UPDATE detected_bill_patterns 
       SET is_ignored = true 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [suggestionId, user.id]
    )

    if (result.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Suggestion not found',
      })
    }

    serverLogger.api(
      'POST',
      `/api/user/bills/suggestions/${suggestionId}/ignore`,
      200,
      Date.now() - startTime,
      user.id
    )

    return {
      statusCode: 200,
      message: 'Suggestion ignored',
    }
  } catch (error: any) {
    serverLogger.api(
      'POST',
      `/api/user/bills/suggestions/${getRouterParam(event, 'id')}/ignore`,
      error.statusCode || 500,
      Date.now() - startTime
    )
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to ignore suggestion',
    })
  }
})
