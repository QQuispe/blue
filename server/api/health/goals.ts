import { defineEventHandler, createError, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getActiveHealthGoal,
  getAllHealthGoals,
  createHealthGoal,
} from '~/server/db/queries/health'
import type { HealthGoalInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const method = getMethod(event)
  const path = event.path

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    // GET /api/health/goals
    if (method === 'GET') {
      const active = await getActiveHealthGoal(user.id)
      const all = await getAllHealthGoals(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, path, 200, duration, user.id)

      return {
        statusCode: 200,
        activeGoal: active
          ? {
              id: active.id,
              goalType: active.goal_type,
              startingWeight: active.starting_weight,
              targetWeight: active.target_weight,
              targetDate: active.target_date,
              weeklyRate: active.weekly_rate,
              isActive: active.is_active,
              targetCalories: active.target_calories,
              targetProtein: active.target_protein,
              targetCarbs: active.target_carbs,
              targetFat: active.target_fat,
              createdAt: active.created_at,
              updatedAt: active.updated_at,
            }
          : null,
        goals: all.map(g => ({
          id: g.id,
          goalType: g.goal_type,
          startingWeight: g.starting_weight,
          targetWeight: g.target_weight,
          targetDate: g.target_date,
          weeklyRate: g.weekly_rate,
          isActive: g.is_active,
          targetCalories: g.target_calories,
          targetProtein: g.target_protein,
          targetCarbs: g.target_carbs,
          targetFat: g.target_fat,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        })),
      }
    }

    // POST /api/health/goals
    if (method === 'POST') {
      const body = await readBody<HealthGoalInput>(event)

      if (!body.goal_type || !body.starting_weight || !body.target_weight) {
        throw createError({
          statusCode: 400,
          statusMessage: 'goal_type, starting_weight, and target_weight are required',
        })
      }

      const goal = await createHealthGoal(user.id, body)

      const duration = Date.now() - startTime
      serverLogger.api(method, path, 201, duration, user.id)

      return {
        statusCode: 201,
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
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health goals request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health goals',
    })
  }
})
