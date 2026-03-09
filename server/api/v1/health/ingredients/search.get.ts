import { defineEventHandler, getQuery, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getCustomFoods, getFoodsByIds } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

interface Ingredient {
  id: number
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ ingredients: Ingredient[] }>> => {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const searchQuery = (query.query || query.q) as string
    const limit = parseInt(query.limit as string) || 20

    if (!searchQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query parameter is required',
      })
    }

    // Get all custom foods and filter by search query
    const allFoods = await getCustomFoods()
    const ingredients = allFoods
      .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, limit)

    return apiSuccess({
      ingredients: ingredients.map(i => ({
        id: i.id,
        name: i.name,
        calories: Math.round(Number(i.calories) || 0),
        protein: Math.round(Number(i.protein) || 0),
        carbs: Math.round(Number(i.carbs) || 0),
        fat: Math.round(Number(i.fat) || 0),
      })),
    })
  })
)
