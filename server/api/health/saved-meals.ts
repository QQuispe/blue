import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  getSavedMeals,
  getSavedMealById,
  createSavedMeal,
  toggleSavedMealFavorite,
  getFoodByName,
  createCustomFood,
  getFoodsByIds,
  updateCustomFood,
} from '~/server/db/queries/health'
import type { HealthSavedMealInput } from '~/types/health'

interface Ingredient {
  food_name: string
  food_id?: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  type?: string
}

async function enrichIngredientsWithLiveData(ingredients: any[]): Promise<Ingredient[]> {
  if (!ingredients || ingredients.length === 0) return []

  const foodsToFetchById = ingredients.filter(ing => ing.food_id).map(ing => ing.food_id)

  let foodsMap: Record<number, any> = {}
  if (foodsToFetchById.length > 0) {
    const foods = await getFoodsByIds(foodsToFetchById)
    for (const food of foods) {
      foodsMap[food.id] = food
    }
  }

  return ingredients.map(ing => {
    if (ing.food_id && foodsMap[ing.food_id]) {
      const food = foodsMap[ing.food_id]
      return {
        food_name: food.name,
        food_id: ing.food_id,
        servings: ing.servings || 1,
        calories: Number(food.calories) || 0,
        protein: Number(food.protein) || 0,
        carbs: Number(food.carbs) || 0,
        fat: Number(food.fat) || 0,
        fiber: Number(food.fiber) || 0,
        serving_size: Number(food.serving_size) || 100,
        serving_unit: food.serving_unit || 'g',
        type: 'food',
      }
    }
    return {
      food_name: ing.food_name,
      food_id: ing.food_id,
      servings: ing.servings || 1,
      calories: ing.calories || 0,
      protein: ing.protein || 0,
      carbs: ing.carbs || 0,
      fat: ing.fat || 0,
      fiber: ing.fiber || 0,
      type: ing.type || 'food',
    }
  })
}

// Calculate recipe totals from enriched ingredients
function calculateRecipeTotals(ingredients: Ingredient[]) {
  return ingredients.reduce(
    (acc, ing) => {
      const servings = ing.servings || 1
      return {
        calories: acc.calories + (Number(ing.calories) || 0) * servings,
        protein: acc.protein + (Number(ing.protein) || 0) * servings,
        carbs: acc.carbs + (Number(ing.carbs) || 0) * servings,
        fat: acc.fat + (Number(ing.fat) || 0) * servings,
        fiber: acc.fiber + (Number(ing.fiber) || 0) * servings,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}

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

      const enrichedMeals = await Promise.all(
        meals.map(async m => {
          const enrichedIngredients = await enrichIngredientsWithLiveData(m.ingredients)
          const totals = calculateRecipeTotals(enrichedIngredients)
          return {
            id: m.id,
            user_id: m.user_id,
            name: m.name,
            meal_type: m.meal_type,
            calories: totals.calories,
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
            fiber: totals.fiber,
            ingredients: enrichedIngredients,
            instructions: m.instructions,
            source: m.source,
            is_favorite: m.is_favorite,
            usda_fdc_id: m.usda_fdc_id,
            created_at: m.created_at,
            updated_at: m.updated_at,
          }
        })
      )

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meals: enrichedMeals,
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

      const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
      const totals = calculateRecipeTotals(enrichedIngredients)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          ingredients: enrichedIngredients,
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

      const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
      const totals = calculateRecipeTotals(enrichedIngredients)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 200, duration, user.id)

      return {
        statusCode: 200,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          ingredients: enrichedIngredients,
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
          if (ingredient.type === 'custom' || !ingredient.food_id) {
            const foodName = ingredient.food_name
            let existingFood = await getFoodByName(foodName)

            if (!existingFood) {
              existingFood = await createCustomFood(user.id, {
                name: foodName,
                serving_size: ingredient.serving_size || 100,
                serving_unit: ingredient.serving_unit || 'g',
                calories: ingredient.calories || 0,
                protein: ingredient.protein || 0,
                carbs: ingredient.carbs || 0,
                fat: ingredient.fat || 0,
              })
            }

            processedIngredients.push({
              food_name: foodName,
              food_id: existingFood.id,
              servings: ingredient.servings || 1,
              type: 'food',
            })
          } else {
            // Single source of truth: Update the actual food in the database
            // This affects ALL recipes using this food across all users
            await updateCustomFood(
              ingredient.food_id,
              user.id,
              {
                calories: parseFloat(ingredient.calories) || 0,
                protein: parseFloat(ingredient.protein) || 0,
                carbs: parseFloat(ingredient.carbs) || 0,
                fat: parseFloat(ingredient.fat) || 0,
                fiber: parseFloat(ingredient.fiber) || 0,
              },
              user.is_admin
            )

            processedIngredients.push({
              food_name: ingredient.food_name,
              food_id: ingredient.food_id,
              servings: ingredient.servings || 1,
              type: 'food',
            })
          }
        }

        mealData.ingredients = processedIngredients
      }

      const meal = await createSavedMeal(user.id, mealData)

      const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
      const totals = calculateRecipeTotals(enrichedIngredients)

      const duration = Date.now() - startTime
      serverLogger.api(method, url.pathname, 201, duration, user.id)

      return {
        statusCode: 201,
        meal: {
          id: meal.id,
          user_id: meal.user_id,
          name: meal.name,
          meal_type: meal.meal_type,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          ingredients: enrichedIngredients,
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
