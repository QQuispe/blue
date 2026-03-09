/**
 * Health Module Types
 * All types for the health/fitness tracking domain
 */

export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type GoalType = 'lose' | 'gain' | 'maintain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type WorkoutStyle = 'strength' | 'cardio' | 'hybrid' | 'hiit' | 'flexibility'

export interface HealthProfile {
  id: number
  user_id: number
  weight: number | null
  height: number | null
  age: number | null
  gender: Gender | null
  activity_level: ActivityLevel
  goal_type?: 'lose' | 'maintain' | 'gain' | null
  created_at: Date
  updated_at: Date
}

export interface HealthProfileInput {
  weight?: number
  height?: number
  age?: number
  gender?: Gender
  activity_level?: ActivityLevel
}

export interface HealthGoal {
  id: number
  user_id: number
  goal_type: GoalType
  starting_weight: number
  target_weight: number
  target_date: string | null
  weekly_rate: number
  is_active: boolean
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
  created_at: Date
  updated_at: Date
}

export interface HealthGoalInput {
  goal_type: GoalType
  starting_weight: number
  target_weight: number
  target_date?: string
  weekly_rate?: number
}

export interface HealthMacroTargetsInput {
  target_calories?: number
  target_protein?: number
  target_carbs?: number
  target_fat?: number
}

export interface HealthCheckin {
  id: number
  user_id: number
  checkin_date: string
  weight: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  biceps: number | null
  thighs: number | null
  notes: string | null
  created_at: Date
}

export interface HealthCheckinInput {
  checkin_date?: string
  weight?: number
  chest?: number
  waist?: number
  hips?: number
  biceps?: number
  thighs?: number
  notes?: string
}

export interface Measurements {
  chest?: number
  waist?: number
  hips?: number
  biceps?: number
  thighs?: number
}

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

export interface HealthFoodInput {
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
  sugar?: number
  sodium?: number
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

export interface HealthMealFoodInput {
  food_id?: number
  food_name: string
  servings?: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface HealthMeal {
  id: number
  user_id: number
  meal_type: MealType
  meal_date: string
  name: string | null
  notes: string | null
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  foods: HealthMealFood[]
  created_at: Date
}

export interface HealthMealInput {
  meal_type: MealType
  meal_date?: string
  name?: string
  notes?: string
  foods: HealthMealFoodInput[]
}

export interface HealthPreferences {
  id: number
  user_id: number
  dietary_restrictions: string[]
  preferred_cuisines: string[]
  allergies: string[]
  liked_foods: string[]
  disliked_foods: string[]
  meal_count: number
  meal_reminders: boolean
  workout_reminders: boolean
  equipment: string[]
  workout_style: WorkoutStyle | null
  workout_frequency: number
  workout_duration: number
  created_at: Date
  updated_at: Date
}

export interface HealthPreferencesInput {
  dietary_restrictions?: string[]
  allergies?: string[]
  liked_foods?: string[]
  disliked_foods?: string[]
  meal_count?: number
  equipment?: string[]
  workout_style?: WorkoutStyle
  workout_frequency?: number
  workout_duration?: number
}

export interface DailyMealPlan {
  day: string
  meals: {
    meal_type: MealType
    name: string
    foods: {
      name: string
      portion: string
      calories: number
      protein: number
      carbs: number
      fat: number
    }[]
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
  }[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

export interface HealthMealPlan {
  id: number
  user_id: number
  week_start: string
  plan_data: DailyMealPlan[]
  daily_calories: number
  daily_protein: number
  daily_carbs: number
  daily_fat: number
  is_active: boolean
  created_at: Date
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  weight?: string
  duration?: string
  notes?: string
}

export interface DailyWorkout {
  day: string
  name: string
  type: string
  exercises: Exercise[]
  duration_minutes: number
  estimated_calories: number
}

export interface HealthWorkoutPlan {
  id: number
  user_id: number
  week_start: string
  plan_data: DailyWorkout[]
  is_active: boolean
  created_at: Date
}

export interface HealthWorkoutSession {
  id: number
  user_id: number
  workout_plan_id: number | null
  session_date: string
  workout_data: DailyWorkout | null
  duration_minutes: number | null
  notes: string | null
  completed: boolean
  created_at: Date
}

export interface HealthWorkoutSessionInput {
  workout_plan_id?: number
  session_date?: string
  workout_data?: DailyWorkout
  duration_minutes?: number
  notes?: string
  completed?: boolean
}

export interface HealthDashboard {
  profile: HealthProfile | null
  activeGoal: {
    id: number
    goalType: string
    startingWeight: number
    targetWeight: number
    targetDate: string
    weeklyRate: number
  } | null
  activeGoalId?: number | null
  latestCheckin: HealthCheckin | null
  todayMeals: HealthMeal[]
  todayMacros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  targetMacros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  weightCheckins?: any[]
  activeMealPlan: HealthMealPlan | null
  activeWorkoutPlan: HealthWorkoutPlan | null
  todayWorkout: DailyWorkout | null
  progress: {
    weightChange: number | null
    weeksRemaining: number | null
    onTrack: boolean | null
  }
}

export interface AIMealPlanRequest {
  profile: HealthProfile
  goal: HealthGoal
  preferences: HealthPreferences
  target_calories: number
  target_protein: number
  target_carbs: number
  target_fat: number
}

export interface AIWorkoutPlanRequest {
  profile: HealthProfile
  goal: HealthGoal
  preferences: HealthPreferences
}

export interface HealthSavedMeal {
  id: number
  user_id: number
  name: string
  meal_type: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  ingredients: any | null
  instructions: string | null
  source: 'custom' | 'ai'
  is_favorite: boolean
  usda_fdc_id: number | null
  created_at: Date
  updated_at: Date
}

export interface HealthSavedMealInput {
  name: string
  meal_type?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  ingredients?: any
  instructions?: string
  source?: 'custom' | 'ai'
  usda_fdc_id?: number
  is_favorite?: boolean
}
