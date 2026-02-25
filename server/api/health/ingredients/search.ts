import { defineEventHandler, getQuery, createError, getRequestURL } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { pool } from '~/server/db'

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const method = 'GET'
  const url = getRequestURL(event)

  serverLogger.info(`→ ${method} /api/health/ingredients/search - Starting request`)

  try {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const searchQuery = (query.q || query.query || '') as string

    if (!searchQuery || searchQuery.length < 1) {
      return {
        statusCode: 200,
        foods: [],
        recipes: [],
      }
    }

    const searchTerm = `%${searchQuery}%`

    const foodsResult = await pool.query(
      `SELECT id, name, brand, serving_size, serving_unit, calories, protein, carbs, fat 
       FROM health_foods 
       WHERE user_id = $1 AND source = 'custom' AND name ILIKE $2
       ORDER BY name ASC
       LIMIT 20`,
      [user.id, searchTerm]
    )

    const recipesResult = await pool.query(
      `SELECT id, name, meal_type, calories, protein, carbs, fat, ingredients
       FROM health_saved_meals 
       WHERE user_id = $1 AND name ILIKE $2
       ORDER BY name ASC
       LIMIT 20`,
      [user.id, searchTerm]
    )

    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, 200, duration, user.id)

    return {
      statusCode: 200,
      foods: foodsResult.rows.map(f => ({
        type: 'food',
        id: f.id,
        name: f.name,
        brand: f.brand,
        serving_size: Number(f.serving_size) || 100,
        serving_unit: f.serving_unit || 'g',
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
      })),
      recipes: recipesResult.rows.map(r => ({
        type: 'recipe',
        id: r.id,
        name: r.name,
        meal_type: r.meal_type,
        calories: Number(r.calories) || 0,
        protein: Number(r.protein) || 0,
        carbs: Number(r.carbs) || 0,
        fat: Number(r.fat) || 0,
        has_ingredients: !!(r.ingredients && r.ingredients.length > 0),
      })),
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration)
    serverLogger.error(`Ingredient search failed: ${error.message}`)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to search ingredients',
    })
  }
})
