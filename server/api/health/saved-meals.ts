import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getSavedMeals,
  getSavedMealById,
  createSavedMeal,
  updateSavedMeal,
  deleteSavedMeal,
  toggleSavedMealFavorite,
} from '~/server/db/queries/health'
import type { HealthSavedMealInput } from '~/types/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)

  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`)

  try {
    const user = await requireAuth(event)
    const path = url.pathname
    const idMatch = path.match(/\/api\/health\/saved-meals\/(\d+)/)
    const id = idMatch ? parseInt(idMatch[1]) : null

    if (method === 'GET' && !id) {
      const meals = await getSavedMeals(user.id)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meals: meals.map(m => ({
          id: m.id,
          user_id: m.user_id,
          name: m.name,
          meal_type: m.meal_type,
          calories: Number(m.calories) || 0,
          protein: Number(m.protein) || 0,
          carbs: Number(m.carbs) || 0,
          fat: Number(m.fat) || 0,
          fiber: Number(m.fiber) || 0,
          ingredients: m.ingredients,
          instructions: m.instructions,
          source: m.source,
          is_favorite: m.is_favorite,
          usda_fdc_id: m.usda_fdc_id,
          created_at: m.created_at,
          updated_at: m.updated_at,
        })),
      }
    }

    if (method === 'GET' && id) {
      const meal = await getSavedMealById(id, user.id)

      if (!meal) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Meal not found',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fat: Number(meal.fat) || 0,
          fiber: Number(meal.fiber) || 0,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          source: meal.source,
          is_favorite: meal.is_favorite,
          usda_fdc_id: meal.usda_fdc_id,
          created_at: meal.created_at,
          updated_at: meal.updated_at,
        },
      }
    }

    if (method === 'POST' && path.endsWith('/favorite') && id) {
      const meal = await toggleSavedMealFavorite(id, user.id)

      if (!meal) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Meal not found',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fat: Number(meal.fat) || 0,
          fiber: Number(meal.fiber) || 0,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          source: meal.source,
          is_favorite: meal.is_favorite,
          usda_fdc_id: meal.usda_fdc_id,
          created_at: meal.created_at,
          updated_at: meal.updated_at,
        },
      }
    }

    if (method === 'POST' && !id) {
      const body = await readBody<HealthSavedMealInput>(event)

      if (!body.name) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Name is required',
        })
      }

      const meal = await createSavedMeal(user.id, body)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          source: meal.source,
          is_favorite: meal.is_favorite,
          usda_fdc_id: meal.usda_fdc_id,
          created_at: meal.created_at,
          updated_at: meal.updated_at,
        },
      }
    }

    if (method === 'PUT' && id) {
      const body = await readBody<Partial<HealthSavedMealInput>>(event)
      const meal = await updateSavedMeal(id, user.id, body)

      if (!meal) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Meal not found',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: Number(meal.calories) || 0,
          protein: Number(meal.protein) || 0,
          carbs: Number(meal.carbs) || 0,
          fat: Number(meal.fat) || 0,
          fiber: Number(meal.fiber) || 0,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          source: meal.source,
          is_favorite: meal.is_favorite,
          usda_fdc_id: meal.usda_fdc_id,
          created_at: meal.created_at,
          updated_at: meal.updated_at,
        },
      }
    }

    if (method === 'DELETE' && id) {
      const result = await deleteSavedMeal(id, user.id)

      if (!result) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Meal not found',
        })
      }

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        message: 'Meal deleted',
      }
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Saved meals request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process saved meals',
    })
  }
})
