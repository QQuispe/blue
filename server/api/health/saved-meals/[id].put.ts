import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  updateSavedMeal,
  getFoodByName,
  createCustomFood,
  getFoodsByIds,
} from '~/server/db/queries/health'

async function enrichIngredientsWithLiveData(ingredients: any[]): Promise<any[]> {
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
function calculateRecipeTotals(ingredients: any[]) {
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
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/saved-meals/')[1]
    const mealId = parseInt(idStr)

    if (!mealId || isNaN(mealId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
    }

    const body = await readBody<any>(event)

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
        } else if (ingredient.type === 'food' && ingredient.food_id) {
          // Don't update the source food's nutrition values here
          // Food nutrition should only be updated via the food edit form
          // This maintains the single source of truth pattern properly:
          // - Edit food → Updates food base values in DB
          // - Edit recipe → Only updates recipe (which foods and portions)
          // - Recipes automatically get updated food values via enrichIngredientsWithLiveData()
          processedIngredients.push({
            food_name: ingredient.food_name,
            food_id: ingredient.food_id,
            servings: ingredient.servings || 1,
            type: 'food',
          })
        } else {
          processedIngredients.push(ingredient)
        }
      }

      mealData.ingredients = processedIngredients
    }

    const meal = await updateSavedMeal(mealId, user.id, mealData, user.is_admin)

    if (!meal) {
      throw createError({ statusCode: 404, statusMessage: 'Saved meal not found' })
    }

    const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
    const totals = calculateRecipeTotals(enrichedIngredients)

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

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
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Health saved-meals update request failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update saved meal',
    })
  }
})
