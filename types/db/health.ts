export interface HealthFood {
  id: number
  user_id?: number
  name: string
  brand: string | null
  barcode: string | null
  serving_size: number
  serving_unit: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number | null
  sugar: number | null
  sodium: number | null
  is_verified: boolean
  source: string
  deleted_at: Date | null
  created_at: Date
}

export interface HealthCheckin {
  id: number
  user_id: number
  date: Date
  weight: number | null
  body_fat: number | null
  notes: string | null
  created_at: Date
}

export interface HealthMeal {
  id: number
  user_id: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_date: Date
  foods: HealthMealFood[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  notes: string | null
  created_at: Date
}

export interface HealthMealFood {
  id: number
  meal_id: number
  food_id: number | null
  food_name: string
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  created_at: Date
}

export interface HealthSavedMeal {
  id: number
  user_id: number
  name: string
  ingredients: SavedMealIngredient[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  source: 'custom' | 'recipe'
  created_at: Date
}

export interface SavedMealIngredient {
  food_name: string
  food_id?: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  type: 'food' | 'recipe' | 'custom'
}

export interface HealthGoal {
  id: number
  user_id: number
  goal_type: string
  target_value: number
  current_value: number
  deadline: Date | null
  is_active: boolean
  created_at: Date
}

export interface HealthProfile {
  id: number
  user_id: number
  height: number | null
  weight: number | null
  goal_weight: number | null
  goal_type: 'lose' | 'maintain' | 'gain' | null
  activity_level: string | null
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
  created_at: Date
  updated_at: Date
}
