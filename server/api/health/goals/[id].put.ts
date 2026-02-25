import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { updateHealthGoal } from '~/server/db/queries/health'
import type { HealthGoalInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/goals/')[1]
    const goalId = parseInt(idStr)

    if (!goalId || isNaN(goalId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid goal ID' })
    }

    const body = await readBody<Partial<HealthGoalInput>>(event)
    const goal = await updateHealthGoal(goalId, body)

    if (!goal) {
      throw createError({ statusCode: 404, statusMessage: 'Goal not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return {
      statusCode: 200,
      goal: {
        id: goal.id,
        goalType: goal.goal_type,
        startingWeight: goal.starting_weight,
        targetWeight: goal.target_weight,
        targetDate: goal.target_date,
        weeklyRate: goal.weekly_rate,
        isActive: goal.is_active,
        targetCalories: goal.target_calories,
        targetProtein: goal.target_protein,
        targetCarbs: goal.target_carbs,
        targetFat: goal.target_fat,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health goals update request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update goal',
    })
  }
})
