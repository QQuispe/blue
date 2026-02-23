import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { generateMealPlan } from '~/server/utils/ai'
import {
  getHealthProfile,
  getActiveHealthGoal,
  getHealthPreferences,
  createHealthMealPlan,
  calculateTargetMacros,
  createSavedMeal,
} from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)

    if (!process.env.OPENAI_API_KEY) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'OpenAI API key not configured. Please add your API key in Settings to generate meal plans.',
      })
    }

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

    const targetMacros = await calculateTargetMacros(profile, goal)

    const mealPlanData = {
      profile,
      goal,
      preferences: {
        dietary_restrictions: preferences?.dietary_restrictions || [],
        allergies: preferences?.allergies || [],
        liked_foods: preferences?.liked_foods || [],
        disliked_foods: preferences?.disliked_foods || [],
        meal_count: preferences?.meal_count || 3,
        workout_frequency: preferences?.workout_frequency || 4,
        workout_duration: preferences?.workout_duration || 45,
      },
      targetCalories: targetMacros.calories,
      targetProtein: targetMacros.protein,
      targetCarbs: targetMacros.carbs,
      targetFat: targetMacros.fat,
    }

    serverLogger.info(`Generating meal plan for user ${user.id}`)
    const planData = await generateMealPlan(mealPlanData)

    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    const weekStart = monday.toISOString().split('T')[0]

    const plan = await createHealthMealPlan(user.id, {
      week_start: weekStart,
      plan_data: planData,
      daily_calories: targetMacros.calories,
      daily_protein: targetMacros.protein,
      daily_carbs: targetMacros.carbs,
      daily_fat: targetMacros.fat,
    })

    const savedMealIds: Record<string, number> = {}

    for (const day of planData) {
      for (const meal of day.meals) {
        const mealKey = `${meal.name.toLowerCase()}-${meal.meal_type}`

        if (!savedMealIds[mealKey]) {
          const savedMeal = await createSavedMeal(user.id, {
            name: meal.name,
            meal_type: meal.meal_type,
            calories: meal.total_calories,
            protein: meal.total_protein,
            carbs: meal.total_carbs,
            fat: meal.total_fat,
            ingredients: meal.foods,
            source: 'ai',
          })
          savedMealIds[mealKey] = savedMeal.id
        }
      }
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, 201, duration, user.id)

    return {
      statusCode: 201,
      plan: {
        id: plan.id,
        weekStart: plan.week_start,
        dailyCalories: plan.daily_calories,
        dailyProtein: plan.daily_protein,
        dailyCarbs: plan.daily_carbs,
        dailyFat: plan.daily_fat,
        planData: plan.plan_data,
        createdAt: plan.created_at,
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Generate meal plan request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to generate meal plan',
    })
  }
})
