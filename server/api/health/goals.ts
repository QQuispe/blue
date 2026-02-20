import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getActiveHealthGoal,
  getAllHealthGoals,
  createHealthGoal,
  updateHealthGoal,
} from '~/server/db/queries/health'
import type { HealthGoalInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      const active = await getActiveHealthGoal(user.id)
      const all = await getAllHealthGoals(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

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
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        })),
      }
    }

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
      serverLogger.api(method, url.pathname, 201, duration, user.id)

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
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
        },
      }
    }

    if (method === 'PUT' || method === 'PATCH') {
      const query = getRequestURL(event).searchParams
      const goalId = parseInt(query.get('id') || '')

      if (!goalId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Goal ID is required',
        })
      }

      const body = await readBody<Partial<HealthGoalInput>>(event)
      const goal = await updateHealthGoal(goalId, body)

      if (!goal) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Goal not found',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

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
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Health goals request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health goals',
    })
  }
})
