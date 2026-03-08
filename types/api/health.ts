import type { ApiSuccess, ApiError, PaginationMeta } from './common'

// Health Profile
export interface HealthProfile {
  height: number | null
  weight: number | null
  goal_weight: number | null
  goal_type: 'lose' | 'maintain' | 'gain' | null
  activity_level: string | null
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
}

// Checkins
export interface Checkin {
  id: number
  user_id: number
  date: string
  weight: number | null
  body_fat: number | null
  notes: string | null
  created_at: string
}

export interface CreateCheckinRequest {
  date: string
  weight?: number
  body_fat?: number
  notes?: string
}

export interface UpdateCheckinRequest {
  weight?: number
  body_fat?: number
  notes?: string
}

// Foods
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
  deleted_at: string | null
  created_at: string
}

export interface CreateFoodRequest {
  name: string
  brand?: string
  barcode?: string
  serving_size: number
  serving_unit?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface UpdateFoodRequest {
  name?: string
  brand?: string
  serving_size?: number
  serving_unit?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

// Meals
export interface MealFood {
  id?: number
  food_id?: number
  food_name: string
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  type: 'food' | 'recipe'
}

export interface Meal {
  id: number
  user_id: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_date: string
  foods: MealFood[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  notes: string | null
  created_at: string
}

export interface CreateMealRequest {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_date: string
  foods: MealFood[]
  notes?: string
}

export interface UpdateMealRequest {
  foods?: MealFood[]
  notes?: string
}

// Saved Meals / Recipes
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

export interface SavedMeal {
  id: number
  user_id: number
  name: string
  ingredients: SavedMealIngredient[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  source: 'custom' | 'recipe'
  created_at: string
}

export interface CreateSavedMealRequest {
  name: string
  ingredients: SavedMealIngredient[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

// Goals
export interface HealthGoal {
  id: number
  user_id: number
  goal_type: 'lose' | 'gain' | 'maintain'
  target_value: number
  current_value: number
  deadline: string | null
  is_active: boolean
  created_at: string
}

export interface CreateGoalRequest {
  goal_type: string
  target_value: number
  current_value: number
  deadline?: string
}

export interface UpdateGoalRequest {
  target_value?: number
  current_value?: number
  deadline?: string
  is_active?: boolean
}

// Dashboard
export interface DailyMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface MacroProgress {
  calories: { current: number; target: number; percentage: number }
  protein: { current: number; target: number; percentage: number }
  carbs: { current: number; target: number; percentage: number }
  fat: { current: number; target: number; percentage: number }
}

export interface DashboardData {
  profile: HealthProfile
  todaysMacros: DailyMacros
  targetMacros: DailyMacros
  remainingMacros: DailyMacros
  macroProgress: MacroProgress
  recentCheckins: Checkin[]
  recentMeals: Meal[]
}

// Barcode
export interface BarcodeLookupResponse {
  barcode: string
  name: string
  brand: string | null
  serving_size: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number | null
  source: 'local' | 'openfoodfacts' | 'usda' | 'notfound'
}

// API Response Types
export interface DashboardResponse extends ApiSuccess<DashboardData> {}
export interface ProfileResponse extends ApiSuccess<{ profile: HealthProfile }> {}
export interface CheckinsResponse extends ApiSuccess<{ checkins: Checkin[] }> {}
export interface CheckinResponse extends ApiSuccess<{ checkin: Checkin }> {}
export interface FoodsResponse extends ApiSuccess<{ foods: HealthFood[]; meta: PaginationMeta }> {}
export interface FoodResponse extends ApiSuccess<{ food: HealthFood }> {}
export interface MealsResponse extends ApiSuccess<{ meals: Meal[] }> {}
export interface MealResponse extends ApiSuccess<{ meal: Meal }> {}
export interface SavedMealsResponse extends ApiSuccess<{ savedMeals: SavedMeal[] }> {}
export interface SavedMealResponse extends ApiSuccess<{ savedMeal: SavedMeal }> {}
export interface GoalsResponse extends ApiSuccess<{ goals: HealthGoal[] }> {}
export interface GoalResponse extends ApiSuccess<{ goal: HealthGoal }> {}
export interface BarcodeResponse extends ApiSuccess<BarcodeLookupResponse> {}

export type HealthError = ApiError
