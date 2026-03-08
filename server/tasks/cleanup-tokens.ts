import { defineTask } from 'nitropack/runtime'
import { deleteExpiredTokens } from '~/server/db/queries/tokens'

/**
 * Nightly cleanup task — removes expired and long-revoked token records.
 * Runs at 3am daily via nitro scheduler.
 * Keeps revoked tokens for 7 days for audit purposes before deletion.
 */
export default defineTask({
  meta: {
    name: 'cleanup:tokens',
    description: 'Remove expired and revoked tokens from DB',
  },
  async run() {
    const deleted = await deleteExpiredTokens()
    console.log(`Token cleanup: removed ${deleted} expired/revoked tokens`)
    return { result: { deleted } }
  },
})
