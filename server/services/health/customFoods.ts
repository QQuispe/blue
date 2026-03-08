import { getCustomFoods, createCustomFood, getFoodsByIds } from '~/server/db/queries/health'
import type { HealthFoodInput } from '~/types/health'

export interface CustomFoodData {
  id: number
  user_id: number | null
  name: string
  brand: string | null
  serving_size: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

/**
 * Get all custom foods
 */
export async function getAllCustomFoods(): Promise<CustomFoodData[]> {
  const foods = await getCustomFoods()

  return foods.map(f => ({
    id: f.id,
    user_id: f.user_id ?? null,
    name: f.name,
    brand: f.brand,
    serving_size: Number(f.serving_size) || 100,
    serving_unit: f.serving_unit || 'g',
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    fiber: Number(f.fiber) || 0,
  }))
}

/**
 * Get foods by IDs
 */
export async function getFoodsByIdList(ids: number[]): Promise<CustomFoodData[]> {
  const foods = await getFoodsByIds(ids)

  return foods.map(f => ({
    id: f.id,
    user_id: f.user_id ?? null,
    name: f.name,
    brand: f.brand,
    serving_size: Number(f.serving_size) || 100,
    serving_unit: f.serving_unit || 'g',
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    fiber: Number(f.fiber) || 0,
  }))
}

/**
 * Create a custom food
 */
export async function createNewCustomFood(
  userId: number,
  input: HealthFoodInput
): Promise<CustomFoodData> {
  const food = await createCustomFood(userId, input)

  return {
    id: food.id,
    user_id: food.user_id ?? null,
    name: food.name,
    brand: food.brand,
    serving_size: Number(food.serving_size) || 100,
    serving_unit: food.serving_unit || 'g',
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    carbs: Number(food.carbs) || 0,
    fat: Number(food.fat) || 0,
    fiber: Number(food.fiber) || 0,
  }
}
