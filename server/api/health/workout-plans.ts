import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getActiveWorkoutPlan,
  getWorkoutPlans,
  createHealthWorkoutPlan,
} from '~/server/db/queries/health'
import type { DailyWorkout, HealthWorkoutPlan } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      const active = await getActiveWorkoutPlan(user.id)
      const all = await getWorkoutPlans(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        activePlan: active
          ? {
              id: active.id,
              weekStart: active.week_start,
              planData: active.plan_data,
              isActive: active.is_active,
              createdAt: active.created_at,
            }
          : null,
        plans: all.map(p => ({
          id: p.id,
          weekStart: p.week_start,
          planData: p.plan_data,
          isActive: p.is_active,
          createdAt: p.created_at,
        })),
      }
    }

    if (method === 'POST') {
      const body = await readBody<any>(event)

      const plan = await createHealthWorkoutPlan(user.id, {
        week_start: body.weekStart || getMonday(new Date()).toISOString().split('T')[0],
        plan_data: body.planData as DailyWorkout[],
      })

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        plan: {
          id: plan.id,
          weekStart: plan.week_start,
          planData: plan.plan_data,
          isActive: plan.is_active,
          createdAt: plan.created_at,
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
    serverLogger.error(`Health workout plans request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health workout plans',
    })
  }
})

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}
