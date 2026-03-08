import { defineEventHandler, readBody, getMethod, createError } from 'h3'
import { withErrorHandling } from '~/server/utils/errorHandler'
import { apiSuccess } from '~/server/utils/response'
import { requireAuth } from '~/server/utils/auth'
import {
  getAllSavedMeals,
  getSavedMeal,
  createNewSavedMeal,
  toggleFavorite,
} from '~/server/services/health/savedMeals'
import type { SavedMealsResponse, SavedMealResponse } from '~/types/api/health'

export default defineEventHandler(
  withErrorHandling(async (event): Promise<SavedMealsResponse | SavedMealResponse> => {
    const user = await requireAuth(event)
    const method = getMethod(event)
    const url = event.path

    // GET /api/v1/health/saved-meals
    if (method === 'GET' && !url?.match(/\/saved-meals\/\d+$/)) {
      const meals = await getAllSavedMeals(user.id)
      return apiSuccess({ savedMeals: meals })
    }

    // GET /api/v1/health/saved-meals/:id
    if (method === 'GET') {
      const idMatch = url?.match(/\/saved-meals\/(\d+)$/)
      const id = idMatch ? parseInt(idMatch[1]) : null

      if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
      }

      const meal = await getSavedMeal(id, user.id)
      if (!meal) {
        throw createError({ statusCode: 404, statusMessage: 'Meal not found' })
      }

      return apiSuccess({ savedMeal: meal })
    }

    // POST /api/v1/health/saved-meals/:id/favorite
    if (method === 'POST' && url?.endsWith('/favorite')) {
      const idMatch = url?.match(/\/saved-meals\/(\d+)/)
      const id = idMatch ? parseInt(idMatch[1]) : null

      if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid saved meal ID' })
      }

      const meal = await toggleFavorite(id, user.id)
      if (!meal) {
        throw createError({ statusCode: 404, statusMessage: 'Meal not found' })
      }

      return apiSuccess({ savedMeal: meal })
    }

    // POST /api/v1/health/saved-meals - create
    if (method === 'POST') {
      const body = await readBody<any>(event)
      const meal = await createNewSavedMeal(user.id, body)
      return apiSuccess({ savedMeal: meal })
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    })
  })
)
