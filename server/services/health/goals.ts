import {
  getActiveHealthGoal,
  getAllHealthGoals,
  createHealthGoal,
  updateHealthGoal,
} from '~/server/db/queries/health'
import type { HealthGoal } from '~/types/api/health'
import type { HealthGoalInput } from '~/types/health'

/**
 * Get all goals for a user
 */
export async function getGoals(
  userId: number
): Promise<{ activeGoal: HealthGoal | null; goals: HealthGoal[] }> {
  const active = await getActiveHealthGoal(userId)
  const all = await getAllHealthGoals(userId)

  const mapGoal = (g: any): HealthGoal => ({
    id: g.id,
    user_id: g.user_id,
    goal_type: g.goal_type,
    target_value: g.target_weight,
    current_value: g.starting_weight,
    deadline: g.target_date,
    is_active: g.is_active,
    created_at: String(g.created_at),
  })

  return {
    activeGoal: active ? mapGoal(active) : null,
    goals: all.map(mapGoal),
  }
}

/**
 * Create a new goal
 */
export async function createGoal(userId: number, input: HealthGoalInput): Promise<HealthGoal> {
  const goal = await createHealthGoal(userId, input)

  return {
    id: goal.id,
    user_id: goal.user_id,
    goal_type: goal.goal_type,
    target_value: goal.target_weight,
    current_value: goal.starting_weight,
    deadline: goal.target_date,
    is_active: goal.is_active,
    created_at: String(goal.created_at),
  }
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: number,
  userId: number,
  input: Partial<HealthGoalInput>
): Promise<HealthGoal | null> {
  const goal = await updateHealthGoal(goalId, userId, input)
  if (!goal) return null

  return {
    id: goal.id,
    user_id: goal.user_id,
    goal_type: goal.goal_type,
    target_value: goal.target_weight,
    current_value: goal.starting_weight,
    deadline: goal.target_date,
    is_active: goal.is_active,
    created_at: String(goal.created_at),
  }
}
