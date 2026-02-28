import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getSavedMeals,
  getSavedMealById,
  createSavedMeal,
  toggleSavedMealFavorite,
  calculateRecipeMacros,
  getFoodByName,
  createCustomFood,
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

    // GET /api/health/saved-meals - list all saved meals
    if (method === 'GET' && !path.includes('/saved-meals/')) {
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

    // GET /api/health/saved-meals/:id - get single saved meal
    if (method === 'GET' && path.match(/\/saved-meals\/\d+$/)) {
      const idMatch = path.match(/\/saved-meals\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1]) : null

      if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
      }

      const meal = await getSavedMealById(id, user.id)

      if (!meal) {
        throw createError({ statusCode: 404, statusMessage: 'Meal not found' })
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

    // POST /api/health/saved-meals/:id/favorite - toggle favorite
    if (
      method === 'POST' &&
      path.endsWith('/favorite') &&
      path.match(/\/saved-meals\/\d+\/favorite$/)
    ) {
      const idMatch = path.match(/\/saved-meals\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1]) : null

      if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
      }

      const meal = await toggleSavedMealFavorite(id, user.id)

      if (!meal) {
        throw createError({ statusCode: 404, statusMessage: 'Meal not found' })
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

    // POST /api/health/saved-meals - create new saved meal
    if (method === 'POST' && !path.match(/\/saved-meals\/\d+/)) {
      const body = await readBody<any>(event)

      if (!body.name) {
        throw createError({ statusCode: 400, statusMessage: 'Name is required' })
      }

      const mealData = { ...body }

      if (body.ingredients && body.ingredients.length > 0) {
        const processedIngredients = []

        for (const ingredient of body.ingredients) {
          if (ingredient.type === 'custom') {
            const existingFood = await getFoodByName(ingredient.food_name)

            if (existingFood) {
              processedIngredients.push({
                ...ingredient,
                type: 'food',
                food_id: existingFood.id,
              })
            } else {
              const newFood = await createCustomFood(user.id, {
                name: ingredient.food_name,
                serving_size: ingredient.serving_size || 100,
                serving_unit: ingredient.serving_unit || 'g',
                calories: ingredient.calories || 0,
                protein: ingredient.protein || 0,
                carbs: ingredient.carbs || 0,
                fat: ingredient.fat || 0,
              })

              processedIngredients.push({
                ...ingredient,
                type: 'food',
                food_id: newFood.id,
              })
            }
          } else {
            processedIngredients.push(ingredient)
          }
        }

        mealData.ingredients = processedIngredients
        const calculated = await calculateRecipeMacros(processedIngredients)
        mealData.calories = calculated.calories
        mealData.protein = calculated.protein
        mealData.carbs = calculated.carbs
        mealData.fat = calculated.fat
      }

      const meal = await createSavedMeal(user.id, mealData)

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
