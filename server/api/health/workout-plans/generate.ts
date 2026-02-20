import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { generateWorkoutPlan } from '~/server/utils/ai'
import {
  getHealthProfile,
  getActiveHealthGoal,
  getHealthPreferences,
  createHealthWorkoutPlan,
} from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed',
      })
    }

    const profile = await getHealthProfile(user.id)
    const goal = await getActiveHealthGoal(user.id)
    const preferences = await getHealthPreferences(user.id)

    if (!profile) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please complete your health profile first',
      })
    }

    if (!goal) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please set a health goal first',
      })
    }

    const workoutData = {
      profile,
      goal,
      preferences: preferences || {
        dietary_restrictions: [],
        allergies: [],
        liked_foods: [],
        disliked_foods: [],
        meal_count: 3,
        equipment: [],
        workout_style: 'strength',
        workout_frequency: 4,
        workout_duration: 45,
      },
    }

    serverLogger.info(`Generating workout plan for user ${user.id}`)
    const planData = await generateWorkoutPlan(workoutData)

    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    const weekStart = monday.toISOString().split('T')[0]

    const plan = await createHealthWorkoutPlan(user.id, {
      week_start: weekStart,
      plan_data: planData,
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
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Generate workout plan request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to generate workout plan',
    })
  }
})
