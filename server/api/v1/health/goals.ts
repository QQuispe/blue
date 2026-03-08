import { defineEventHandler, getMethod, readBody, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getGoals, createGoal } from '~/server/services/health/goals'
import type { GoalsResponse, GoalResponse } from '~/types/api/health'
import type { HealthGoalInput } from '~/types/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<GoalsResponse | GoalResponse> => {
    const user = await requireAuth(event)
    const method = getMethod(event)

    if (method === 'GET') {
      const { goals } = await getGoals(user.id)
      return apiSuccess({ goals })
    }

    if (method === 'POST') {
      const body = await readBody<HealthGoalInput>(event)

      if (!body.goal_type || !body.starting_weight || !body.target_weight) {
        throw createError({
          statusCode: 400,
          statusMessage: 'goal_type, starting_weight, and target_weight are required',
        })
      }

      const goal = await createGoal(user.id, body)
      return apiSuccess({ goal })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
