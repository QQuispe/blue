import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getActiveMealPlan, getMealPlans, createHealthMealPlan } from '~/server/db/queries/health'
import type { DailyMealPlan, HealthMealPlan } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method === 'GET') {
      const active = await getActiveMealPlan(user.id)
      const all = await getMealPlans(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        activePlan: active
          ? {
              id: active.id,
              weekStart: active.week_start,
              dailyCalories: Number(active.daily_calories) || 2000,
              dailyProtein: Number(active.daily_protein) || 120,
              dailyCarbs: Number(active.daily_carbs) || 200,
              dailyFat: Number(active.daily_fat) || 65,
              planData: active.plan_data,
            }
          : null,
        plans: all.map(p => ({
          id: p.id,
          weekStart: p.week_start,
          dailyCalories: Number(p.daily_calories) || 2000,
          dailyProtein: Number(p.daily_protein) || 120,
          dailyCarbs: Number(p.daily_carbs) || 200,
          dailyFat: Number(p.daily_fat) || 65,
          planData: p.plan_data,
          isActive: p.is_active,
          createdAt: p.created_at,
        })),
      }
    }

    if (method === 'POST') {
      const body = await readBody<any>(event)

      const plan = await createHealthMealPlan(user.id, {
        week_start: body.weekStart || getMonday(new Date()).toISOString().split('T')[0],
        plan_data: body.planData as DailyMealPlan[],
        daily_calories: body.dailyCalories,
        daily_protein: body.dailyProtein,
        daily_carbs: body.dailyCarbs,
        daily_fat: body.dailyFat,
      })

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        plan: {
          id: plan.id,
          weekStart: plan.week_start,
          dailyCalories: Number(plan.daily_calories) || 2000,
          dailyProtein: Number(plan.daily_protein) || 120,
          dailyCarbs: Number(plan.daily_carbs) || 200,
          dailyFat: Number(plan.daily_fat) || 65,
          planData: plan.plan_data,
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
    serverLogger.error(`Health meal plans request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health meal plans',
    })
  }
})

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}
