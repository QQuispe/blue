import {
  getActiveWorkoutPlan,
  getWorkoutPlans,
  createHealthWorkoutPlan,
} from '~/server/db/queries/health'

export interface WorkoutPlanData {
  id: number
  user_id: number
  week_start: string
  plan_data: any
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
 * Get workout plans for a user
 */
export async function getUserWorkoutPlans(userId: number): Promise<{
  activePlan: WorkoutPlanData | null
  plans: WorkoutPlanData[]
}> {
  const active = await getActiveWorkoutPlan(userId)
  const all = await getWorkoutPlans(userId)

  const mapPlan = (p: any): WorkoutPlanData => ({
    id: p.id,
    user_id: p.user_id,
    week_start: p.week_start,
    plan_data: p.plan_data,
    is_active: p.is_active,
    created_at: String(p.created_at),
  })

  return {
    activePlan: active ? mapPlan(active) : null,
    plans: all.map(mapPlan),
  }
}

/**
 * Create a workout plan
 */
export async function createWorkoutPlan(
  userId: number,
  input: {
    week_start?: string
    plan_data?: any
  }
): Promise<WorkoutPlanData> {
  const plan = await createHealthWorkoutPlan(userId, {
    week_start: input.week_start || getMonday(new Date()).toISOString().split('T')[0],
    plan_data: input.plan_data || [],
  })

  return {
    id: plan.id,
    user_id: plan.user_id,
    week_start: plan.week_start,
    plan_data: plan.plan_data,
    is_active: plan.is_active,
    created_at: String(plan.created_at),
  }
}
