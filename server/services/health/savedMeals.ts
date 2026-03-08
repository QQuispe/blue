import {
  getSavedMeals,
  getSavedMealById,
  createSavedMeal,
  updateSavedMeal,
  deleteSavedMeal,
  toggleSavedMealFavorite,
  getFoodsByIds,
  getFoodByName,
  createCustomFood,
} from '~/server/db/queries/health'
import type { SavedMeal, SavedMealIngredient } from '~/types/api/health'

export interface IngredientData {
  food_name: string
  food_id?: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  type?: string
}

async function enrichIngredientsWithLiveData(ingredients: any[]): Promise<IngredientData[]> {
  if (!ingredients || ingredients.length === 0) return []

  const foodsToFetchById = ingredients.filter(ing => ing.food_id).map(ing => ing.food_id)

  const foodsMap: Record<number, any> = {}
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

function calculateRecipeTotals(ingredients: IngredientData[]) {
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

/**
 * Get all saved meals for a user
 */
export async function getAllSavedMeals(userId: number): Promise<SavedMeal[]> {
  const meals = await getSavedMeals(userId)

  const enrichedMeals = await Promise.all(
    meals.map(async m => {
      const enrichedIngredients = await enrichIngredientsWithLiveData(m.ingredients)
      const totals = calculateRecipeTotals(enrichedIngredients)

      return {
        id: m.id,
        user_id: m.user_id,
        name: m.name,
        ingredients: enrichedIngredients.map(i => ({
          food_name: i.food_name,
          food_id: i.food_id,
          servings: i.servings,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          type: (i.type as 'food' | 'recipe' | 'custom') || 'food',
        })),
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        source: (m.source as 'custom' | 'recipe') || 'custom',
        created_at: String(m.created_at),
      }
    })
  )

  return enrichedMeals
}

/**
 * Get a single saved meal by ID
 */
export async function getSavedMeal(mealId: number, userId: number): Promise<SavedMeal | null> {
  const meal = await getSavedMealById(mealId, userId)
  if (!meal) return null

  const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
  const totals = calculateRecipeTotals(enrichedIngredients)

  return {
    id: meal.id,
    user_id: meal.user_id,
    name: meal.name,
    ingredients: enrichedIngredients.map(i => ({
      food_name: i.food_name,
      food_id: i.food_id,
      servings: i.servings,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      type: (i.type as 'food' | 'recipe' | 'custom') || 'food',
    })),
    total_calories: totals.calories,
    total_protein: totals.protein,
    total_carbs: totals.carbs,
    total_fat: totals.fat,
    source: (meal.source as 'custom' | 'recipe') || 'custom',
    created_at: String(meal.created_at),
  }
}

/**
 * Create a saved meal
 */
export async function createNewSavedMeal(userId: number, input: any): Promise<SavedMeal> {
  const mealData = { ...input }

  if (input.ingredients && input.ingredients.length > 0) {
    const processedIngredients = []

    for (const ingredient of input.ingredients) {
      if (ingredient.type === 'custom' || !ingredient.food_id) {
        const foodName = ingredient.food_name
        let existingFood = await getFoodByName(foodName)

        if (!existingFood) {
          existingFood = await createCustomFood(userId, {
            name: foodName,
            serving_size: ingredient.serving_size || 100,
            serving_unit: ingredient.serving_unit || 'g',
            calories: ingredient.calories || 0,
            protein: ingredient.protein || 0,
            carbs: ingredient.carbs || 0,
            fat: ingredient.fat || 0,
          })
        }

        processedIngredients.push({
          food_name: foodName,
          food_id: existingFood.id,
          servings: ingredient.servings || 1,
          type: 'food',
        })
      } else {
        processedIngredients.push({
          food_name: ingredient.food_name,
          food_id: ingredient.food_id,
          servings: ingredient.servings || 1,
          type: 'food',
        })
      }
    }

    mealData.ingredients = processedIngredients
  }

  const meal = await createSavedMeal(userId, mealData)

  const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
  const totals = calculateRecipeTotals(enrichedIngredients)

  return {
    id: meal.id,
    user_id: meal.user_id,
    name: meal.name,
    ingredients: enrichedIngredients.map(i => ({
      food_name: i.food_name,
      food_id: i.food_id,
      servings: i.servings,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      type: (i.type as 'food' | 'recipe' | 'custom') || 'food',
    })),
    total_calories: totals.calories,
    total_protein: totals.protein,
    total_carbs: totals.carbs,
    total_fat: totals.fat,
    source: (meal.source as 'custom' | 'recipe') || 'custom',
    created_at: String(meal.created_at),
  }
}

/**
 * Update a saved meal
 */
export async function updateExistingSavedMeal(
  mealId: number,
  userId: number,
  input: any
): Promise<SavedMeal | null> {
  const meal = await updateSavedMeal(mealId, userId, input)
  if (!meal) return null

  const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
  const totals = calculateRecipeTotals(enrichedIngredients)

  return {
    id: meal.id,
    user_id: meal.user_id,
    name: meal.name,
    ingredients: enrichedIngredients.map(i => ({
      food_name: i.food_name,
      food_id: i.food_id,
      servings: i.servings,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      type: (i.type as 'food' | 'recipe' | 'custom') || 'food',
    })),
    total_calories: totals.calories,
    total_protein: totals.protein,
    total_carbs: totals.carbs,
    total_fat: totals.fat,
    source: (meal.source as 'custom' | 'recipe') || 'custom',
    created_at: String(meal.created_at),
  }
}

/**
 * Delete a saved meal
 */
export async function removeSavedMeal(mealId: number, userId: number): Promise<boolean> {
  return await deleteSavedMeal(mealId, userId)
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(mealId: number, userId: number): Promise<SavedMeal | null> {
  const meal = await toggleSavedMealFavorite(mealId, userId)
  if (!meal) return null

  const enrichedIngredients = await enrichIngredientsWithLiveData(meal.ingredients)
  const totals = calculateRecipeTotals(enrichedIngredients)

  return {
    id: meal.id,
    user_id: meal.user_id,
    name: meal.name,
    ingredients: enrichedIngredients.map(i => ({
      food_name: i.food_name,
      food_id: i.food_id,
      servings: i.servings,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      type: (i.type as 'food' | 'recipe' | 'custom') || 'food',
    })),
    total_calories: totals.calories,
    total_protein: totals.protein,
    total_carbs: totals.carbs,
    total_fat: totals.fat,
    source: (meal.source as 'custom' | 'recipe') || 'custom',
    created_at: String(meal.created_at),
  }
}
