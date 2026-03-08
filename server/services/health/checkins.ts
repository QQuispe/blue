import {
  getHealthCheckins,
  createHealthCheckin,
  updateHealthCheckin,
  deleteHealthCheckin,
} from '~/server/db/queries/health'
import type { HealthCheckinInput } from '~/types/health'
import type { Checkin } from '~/types/api/health'

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
 * Get user checkins
 */
export async function getCheckins(userId: number, limit: number = 30): Promise<Checkin[]> {
  const checkins = await getHealthCheckins(userId, limit)

  return checkins.map(c => ({
    id: c.id,
    user_id: c.user_id,
    date: formatDateField(c.checkin_date),
    weight: c.weight,
    body_fat: null, // Not in current DB schema
    notes: c.notes,
    created_at: String(c.created_at),
  }))
}

/**
 * Create a new checkin
 */
export async function createCheckin(userId: number, data: HealthCheckinInput): Promise<Checkin> {
  const checkin = await createHealthCheckin(userId, data)

  return {
    id: checkin.id,
    user_id: checkin.user_id,
    date: formatDateField(checkin.checkin_date),
    weight: checkin.weight,
    body_fat: null,
    notes: checkin.notes,
    created_at: String(checkin.created_at),
  }
}

/**
 * Update a checkin
 */
export async function updateCheckin(
  userId: number,
  checkinId: number,
  data: Partial<HealthCheckinInput>
): Promise<Checkin | null> {
  const checkin = await updateHealthCheckin(userId, checkinId, data)
  if (!checkin) return null

  return {
    id: checkin.id,
    user_id: checkin.user_id,
    date: formatDateField(checkin.checkin_date),
    weight: checkin.weight,
    body_fat: null,
    notes: checkin.notes,
    created_at: String(checkin.created_at),
  }
}

/**
 * Delete a checkin
 */
export async function deleteCheckin(userId: number, checkinId: number): Promise<boolean> {
  return await deleteHealthCheckin(userId, checkinId)
}
