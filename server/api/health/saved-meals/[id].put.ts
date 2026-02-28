import { defineEventHandler, createError, getRequestURL, getMethod, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import {
  updateSavedMeal,
  calculateRecipeMacros,
  getFoodByName,
  createCustomFood,
  updateCustomFood,
} from '~/server/db/queries/health'

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
          const updatedFood = await updateCustomFood(ingredient.food_id, user.id, {
            name: ingredient.food_name,
            serving_size: ingredient.serving_size || 100,
            serving_unit: ingredient.serving_unit || 'g',
            calories: ingredient.calories,
            protein: ingredient.protein,
            carbs: ingredient.carbs,
            fat: ingredient.fat,
          })
          processedIngredients.push(ingredient)
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

    const meal = await updateSavedMeal(mealId, user.id, mealData, user.is_admin)

    if (!meal) {
      throw createError({ statusCode: 404, statusMessage: 'Saved meal not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

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
