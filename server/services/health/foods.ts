import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { HealthFood } from '~/types/api/health'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

const nutrientIds = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
}

export interface FoodSearchResult {
  fdcId: number
  name: string
  brand: string | null
  servingSize: number
  servingUnit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  dataType: string
  ingredients: string | null
}

/**
 * Search foods using USDA API
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const config = useRuntimeConfig()
  const apiKey = config.usdaApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'USDA API key not configured',
    })
  }

  const response = await fetch(
    `${USDA_API_BASE}/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=25`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `USDA API error: ${response.statusText}`,
    })
  }

  const data = await response.json()

  return (
    data.foods?.map((food: any) => ({
      fdcId: food.fdcId,
      name: food.description,
      brand: food.brandOwner || food.brandName || null,
      servingSize: food.servingSize || 100,
      servingUnit: food.servingSizeUnit || 'g',
      calories:
        food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.calories)?.value || 0,
      protein:
        food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.protein)?.value || 0,
      carbs: food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.carbs)?.value || 0,
      fat: food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.fat)?.value || 0,
      fiber: food.foodNutrients?.find((n: any) => n.nutrientId === nutrientIds.fiber)?.value || 0,
      dataType: food.dataType,
      ingredients: food.ingredients || null,
    })) || []
  )
}
