import {
  getHealthProfile,
  createHealthProfile,
  updateHealthProfile,
} from '~/server/db/queries/health'
import type { HealthProfile } from '~/types/api/health'
import type { ActivityLevel } from '~/types/health'

/**
 * Get user health profile - returns HealthProfile type from API
 */
export async function getProfile(userId: number): Promise<HealthProfile> {
  let profile = await getHealthProfile(userId)

  if (!profile) {
    profile = await createHealthProfile(userId, {})
  }

  return {
    height: profile.height,
    weight: profile.weight,
    goal_weight: null, // Not in current schema
    goal_type: null, // Not in current schema
    activity_level: profile.activity_level,
    target_calories: null, // Calculate based on profile
    target_protein: null,
    target_carbs: null,
    target_fat: null,
  }
}

/**
 * Update user health profile
 */
export async function updateProfile(
  userId: number,
  data: Partial<{
    weight: number
    height: number
    age: number
    activity_level: ActivityLevel
  }>
): Promise<HealthProfile> {
  let profile = await getHealthProfile(userId)

  if (!profile) {
    profile = await createHealthProfile(userId, data)
  } else {
    profile = await updateHealthProfile(userId, data)
  }

  if (!profile) {
    throw new Error('Failed to update profile')
  }

  return {
    height: profile.height,
    weight: profile.weight,
    goal_weight: null,
    goal_type: null,
    activity_level: profile.activity_level,
    target_calories: null,
    target_protein: null,
    target_carbs: null,
    target_fat: null,
  }
}
