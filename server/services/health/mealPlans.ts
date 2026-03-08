import { getActiveMealPlan, getMealPlans, createHealthMealPlan } from '~/server/db/queries/health'

export interface MealPlanData {
  id: number
  user_id: number
  week_start: string
  plan_data: any
  daily_calories: number
  daily_protein: number
  daily_carbs: number
  daily_fat: number
  is_active: boolean
  created_at: string
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

/**
 * Get meal plans for a user
 */
export async function getUserMealPlans(userId: number): Promise<{
  activePlan: MealPlanData | null
  plans: MealPlanData[]
}> {
  const active = await getActiveMealPlan(userId)
  const all = await getMealPlans(userId)

  const mapPlan = (p: any): MealPlanData => ({
    id: p.id,
    user_id: p.user_id,
    week_start: p.week_start,
    plan_data: p.plan_data,
    daily_calories: Number(p.daily_calories) || 2000,
    daily_protein: Number(p.daily_protein) || 120,
    daily_carbs: Number(p.daily_carbs) || 200,
    daily_fat: Number(p.daily_fat) || 65,
    is_active: p.is_active,
    created_at: String(p.created_at),
  })

  return {
    activePlan: active ? mapPlan(active) : null,
    plans: all.map(mapPlan),
  }
}

/**
 * Create a meal plan
 */
export async function createMealPlan(
  userId: number,
  input: {
    week_start?: string
    plan_data?: any
    daily_calories?: number
    daily_protein?: number
    daily_carbs?: number
    daily_fat?: number
  }
): Promise<MealPlanData> {
  const plan = await createHealthMealPlan(userId, {
    week_start: input.week_start || getMonday(new Date()).toISOString().split('T')[0],
    plan_data: input.plan_data || [],
    daily_calories: input.daily_calories,
    daily_protein: input.daily_protein,
    daily_carbs: input.daily_carbs,
    daily_fat: input.daily_fat,
  })

  return {
    id: plan.id,
    user_id: plan.user_id,
    week_start: plan.week_start,
    plan_data: plan.plan_data,
    daily_calories: Number(plan.daily_calories) || 2000,
    daily_protein: Number(plan.daily_protein) || 120,
    daily_carbs: Number(plan.daily_carbs) || 200,
    daily_fat: Number(plan.daily_fat) || 65,
    is_active: plan.is_active,
    created_at: String(plan.created_at),
  }
}
