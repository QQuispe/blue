import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getTodayMeals, getMealsByDate, createHealthMeal } from '~/server/db/queries/health'
import type { HealthMealInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    // GET /api/health/meals or /api/health/meals?date=YYYY-MM-DD
    if (method === 'GET') {
      const date = url.searchParams.get('date')
      const meals = date ? await getMealsByDate(user.id, date) : await getTodayMeals(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, path, 200, duration, user.id)

      return {
        statusCode: 200,
        meals: meals.map(m => ({
          id: m.id,
          mealType: m.meal_type,
          mealDate: m.meal_date,
          name: m.name,
          notes: m.notes,
          totalCalories: Number(m.total_calories) || 0,
          totalProtein: Number(m.total_protein) || 0,
          totalCarbs: Number(m.total_carbs) || 0,
          totalFat: Number(m.total_fat) || 0,
          foods: m.foods || [],
          createdAt: m.created_at,
        })),
      }
    }

    // POST /api/health/meals - create meal
    if (method === 'POST') {
      const body = await readBody<HealthMealInput>(event)

      if (!body.meal_type || !body.foods || body.foods.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'meal_type and at least one food are required',
        })
      }

      const totals = body.foods.reduce(
        (acc, food) => ({
          calories: acc.calories + (food.calories || 0) * (food.servings || 1),
          protein: acc.protein + (food.protein || 0) * (food.servings || 1),
          carbs: acc.carbs + (food.carbs || 0) * (food.servings || 1),
          fat: acc.fat + (food.fat || 0) * (food.servings || 1),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )

      const { foods: _foods, ...mealData } = body
      const meal = await createHealthMeal(
        user.id,
        {
          ...mealData,
          meal_type: body.meal_type,
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
        },
        body.foods.map(f => ({
          food_name: f.food_name,
          food_id: f.food_id,
          servings: f.servings,
          calories: (f.calories || 0) * (f.servings || 1),
          protein: (f.protein || 0) * (f.servings || 1),
          carbs: (f.carbs || 0) * (f.servings || 1),
          fat: (f.fat || 0) * (f.servings || 1),
        }))
      )

      const duration = Date.now() - startTime
      serverLogger.api(method, path, 201, duration, user.id)

      return {
        statusCode: 201,
        meal: {
          id: meal.id,
          mealType: meal.meal_type,
          mealDate: meal.meal_date,
          name: meal.name,
          notes: meal.notes,
          totalCalories: meal.total_calories,
          totalProtein: meal.total_protein,
          totalCarbs: meal.total_carbs,
          totalFat: meal.total_fat,
          createdAt: meal.created_at,
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
    serverLogger.error(`Health meals request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process health meals',
    })
  }
})
