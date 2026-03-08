import {
  getTodayMeals,
  getMealsByDate,
  createHealthMeal,
  updateHealthMeal,
  deleteHealthMeal,
} from '~/server/db/queries/health'
import type { HealthMealInput } from '~/types/health'
import type { Meal, MealFood } from '~/types/api/health'

const formatDateField = (dateVal: any): string => {
  if (!dateVal) return ''
  if (typeof dateVal === 'object' && dateVal.toISOString) {
    return dateVal.toISOString().split('T')[0]
  }
  const str = String(dateVal)
  if (str.includes('T')) {
    return str.split('T')[0]
  }
  return str
}

/**
 * Get meals for a user (today or specific date)
 */
export async function getMeals(userId: number, date?: string): Promise<Meal[]> {
  const meals = date ? await getMealsByDate(userId, date) : await getTodayMeals(userId)

  return meals.map(m => ({
    id: m.id,
    user_id: m.user_id,
    meal_type: m.meal_type,
    meal_date: formatDateField(m.meal_date),
    foods: (m.foods || []).map(
      (f: any): MealFood => ({
        id: f.id,
        food_id: f.food_id,
        food_name: f.food_name,
        servings: f.servings,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        type: 'food',
      })
    ),
    total_calories: Number(m.total_calories) || 0,
    total_protein: Number(m.total_protein) || 0,
    total_carbs: Number(m.total_carbs) || 0,
    total_fat: Number(m.total_fat) || 0,
    notes: m.notes,
    created_at: String(m.created_at),
  }))
}

/**
 * Create a new meal with food totals calculated
 */
export async function createMeal(userId: number, input: HealthMealInput): Promise<Meal> {
  const totals = input.foods.reduce(
    (acc, food) => ({
      calories: acc.calories + (food.calories || 0) * (food.servings || 1),
      protein: acc.protein + (food.protein || 0) * (food.servings || 1),
      carbs: acc.carbs + (food.carbs || 0) * (food.servings || 1),
      fat: acc.fat + (food.fat || 0) * (food.servings || 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const mealFoodsForDb = input.foods.map(f => ({
    food_name: f.food_name,
    food_id: f.food_id,
    servings: f.servings ?? 1,
    calories: (f.calories || 0) * (f.servings ?? 1),
    protein: (f.protein || 0) * (f.servings ?? 1),
    carbs: (f.carbs || 0) * (f.servings ?? 1),
    fat: (f.fat || 0) * (f.servings ?? 1),
  }))

  const meal = await createHealthMeal(
    userId,
    {
      meal_type: input.meal_type,
      meal_date: input.meal_date,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
      notes: input.notes,
    },
    mealFoodsForDb
  )

  return {
    id: meal.id,
    user_id: meal.user_id,
    meal_type: meal.meal_type,
    meal_date: formatDateField(meal.meal_date),
    foods: (meal.foods || []).map(
      (f: any): MealFood => ({
        id: f.id,
        food_id: f.food_id,
        food_name: f.food_name,
        servings: f.servings,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        type: 'food',
      })
    ),
    total_calories: meal.total_calories,
    total_protein: meal.total_protein,
    total_carbs: meal.total_carbs,
    total_fat: meal.total_fat,
    notes: meal.notes,
    created_at: String(meal.created_at),
  }
}

/**
 * Update a meal
 */
export async function updateMeal(
  userId: number,
  mealId: number,
  input: Partial<HealthMealInput>
): Promise<Meal | null> {
  // Calculate new totals if foods are provided
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  let mealFoodsForDb: any[] = []

  if (input.foods && input.foods.length > 0) {
    totals = input.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.calories || 0) * (food.servings || 1),
        protein: acc.protein + (food.protein || 0) * (food.servings || 1),
        carbs: acc.carbs + (food.carbs || 0) * (food.servings || 1),
        fat: acc.fat + (food.fat || 0) * (food.servings || 1),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    mealFoodsForDb = input.foods.map(f => ({
      food_name: f.food_name,
      food_id: f.food_id,
      servings: f.servings ?? 1,
      calories: (f.calories || 0) * (f.servings ?? 1),
      protein: (f.protein || 0) * (f.servings ?? 1),
      carbs: (f.carbs || 0) * (f.servings ?? 1),
      fat: (f.fat || 0) * (f.servings ?? 1),
    }))
  }

  const meal = await updateHealthMeal(
    mealId,
    userId,
    {
      meal_type: input.meal_type,
      meal_date: input.meal_date,
      total_calories: totals.calories || undefined,
      total_protein: totals.protein || undefined,
      total_carbs: totals.carbs || undefined,
      total_fat: totals.fat || undefined,
      notes: input.notes,
    },
    mealFoodsForDb
  )
  if (!meal) return null

  return {
    id: meal.id,
    user_id: meal.user_id,
    meal_type: meal.meal_type,
    meal_date: formatDateField(meal.meal_date),
    foods: (meal.foods || []).map(
      (f: any): MealFood => ({
        id: f.id,
        food_id: f.food_id,
        food_name: f.food_name,
        servings: f.servings,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        type: 'food',
      })
    ),
    total_calories: meal.total_calories,
    total_protein: meal.total_protein,
    total_carbs: meal.total_carbs,
    total_fat: meal.total_fat,
    notes: meal.notes,
    created_at: String(meal.created_at),
  }
}

/**
 * Delete a meal
 */
export async function deleteMeal(userId: number, mealId: number): Promise<boolean> {
  return await deleteHealthMeal(mealId, userId)
}
