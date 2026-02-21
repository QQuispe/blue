import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { getHealthProfile, getActiveHealthGoal } from '~/server/db/queries/health'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)

  const profile = await getHealthProfile(user.id)
  const activeGoal = await getActiveHealthGoal(user.id)

  const isComplete = !!(profile && activeGoal)

  return {
    isComplete,
    hasProfile: !!profile,
    hasGoal: !!activeGoal,
  }
})
