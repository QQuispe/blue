import { defineEventHandler, getQuery, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import { getRecentFoods } from '~/server/db/queries/health'
import type { ApiSuccess } from '~/types/api/common'

interface RecentFood {
  food_name: string
  food_id: number
  calories: number
  protein: number
  carbs: number
  fat: number
  last_servings: number
  meal_date: string
  meal_type: string
}

export default defineEventHandler(
  withErrorHandling(async (event): Promise<ApiSuccess<{ foods: RecentFood[] }>> => {
    const user = await requireAuth(event)
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 10

    const foods = await getRecentFoods(user.id, limit)

    return apiSuccess({
      foods: foods.map(f => ({
        food_name: f.food_name,
        food_id: f.food_id,
        calories: Math.round(Number(f.calories) || 0),
        protein: Math.round(Number(f.protein) || 0),
        carbs: Math.round(Number(f.carbs) || 0),
        fat: Math.round(Number(f.fat) || 0),
        last_servings: Number(f.last_servings) || 1,
        meal_date: f.meal_date,
        meal_type: f.meal_type,
      })),
    })
  })
)
