import { defineEventHandler, readBody, getRouterParams, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { updateHealthGoal } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ goal: any }>> => {
    const user = await requireAuth(event)
    const params = getRouterParams(event)
    const goalId = parseInt(params.id as string)

    if (!goalId || isNaN(goalId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid goal ID',
      })
    }

    const body = await readBody<{
      goal_type?: 'lose' | 'gain' | 'maintain'
      starting_weight?: number
      target_weight?: number
      target_date?: string
      weekly_rate?: number
      is_active?: boolean
      target_calories?: number
      target_protein?: number
      target_carbs?: number
      target_fat?: number
    }>(event)

    const goal = await updateHealthGoal(goalId, user.id, body)

    if (!goal) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Goal not found',
      })
    }

    return apiSuccess({
      goal: {
        id: goal.id,
        goal_type: goal.goal_type,
        starting_weight: goal.starting_weight,
        target_weight: goal.target_weight,
        target_date: goal.target_date,
        weekly_rate: goal.weekly_rate,
        is_active: goal.is_active,
        target_calories: goal.target_calories,
        target_protein: goal.target_protein,
        target_carbs: goal.target_carbs,
        target_fat: goal.target_fat,
      },
    })
  })
)
