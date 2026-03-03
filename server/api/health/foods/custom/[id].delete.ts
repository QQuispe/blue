import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { deleteCustomFood, getRecipesUsingFood } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const url = getRequestURL(event)
  const method = getMethod(event)
  const path = url.pathname

  serverLogger.info(`→ ${method} ${path} - Starting request`)

  try {
    const user = await requireAuth(event)

    const idStr = path.split('/custom/')[1]
    const foodId = parseInt(idStr)

    if (!foodId || isNaN(foodId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid food ID' })
    }

    // Check if food is used in any recipes
    let recipesUsingFood
    try {
      recipesUsingFood = await getRecipesUsingFood(foodId)
      console.log(`[DELETE] Checked recipes for food ${foodId}:`, recipesUsingFood)
    } catch (queryError: any) {
      console.error(`[DELETE] getRecipesUsingFood query failed for food ${foodId}:`, queryError)
      serverLogger.error(`[DELETE] Query error: ${queryError.message}`)
      throw createError({
        statusCode: 500,
        statusMessage: `Query failed: ${queryError.message}`,
      })
    }

    if (recipesUsingFood.length > 0) {
      console.log(
        `[DELETE] Food ${foodId} is used in ${recipesUsingFood.length} recipes:`,
        recipesUsingFood
      )
      throw createError({
        statusCode: 409,
        statusMessage: 'Ingredient in use',
        data: {
          message: `This ingredient is used in ${recipesUsingFood.length} recipe(s)`,
          recipes: recipesUsingFood,
        },
      })
    }

    const deleted = await deleteCustomFood(foodId, user.id, user.is_admin)

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Food not found' })
    }

    const duration = Date.now() - startTime
    serverLogger.api(method, path, 200, duration, user.id)

    return { statusCode: 200, message: 'Food deleted' }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, path, error.statusCode || 500, duration)
    serverLogger.error(`Custom foods delete request failed: ${error.message}`)
    console.error(`[DELETE] Full error details:`, error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete custom food',
    })
  }
})
