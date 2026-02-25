import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { updateHealthMeal } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/meals/')[1]
    const mealId = parseInt(idStr)

    if (!mealId || isNaN(mealId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid meal ID' })
    }

    const body = await readBody<any>(event)

    const meal = await updateHealthMeal(
      mealId,
      user.id,
      {
        meal_type: body.meal_type,
        total_calories: body.total_calories,
        total_protein: body.total_protein,
        total_carbs: body.total_carbs,
        total_fat: body.total_fat,
      },
      body.foods || []
    )

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return {
      statusCode: 200,
      meal: {
        id: meal.id,
        mealType: meal.meal_type,
        mealDate: meal.meal_date,
        name: meal.name,
        notes: meal.notes,
        totalCalories: Number(meal.total_calories) || 0,
        totalProtein: Number(meal.total_protein) || 0,
        totalCarbs: Number(meal.total_carbs) || 0,
        totalFat: Number(meal.total_fat) || 0,
        createdAt: meal.created_at,
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health meals update request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update meal',
    })
  }
})
