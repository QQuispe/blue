import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getRouterParam } from 'h3'
import { ignoreBillSuggestion } from '~/server/services/finance/bills.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const suggestionId = getRouterParam(event, 'id')

  if (!suggestionId) {
    throw new Error('Suggestion ID is required')
  }

  const parsedSuggestionId = parseInt(suggestionId)
  if (isNaN(parsedSuggestionId)) {
    throw new Error('Invalid suggestion ID')
  }

  await ignoreBillSuggestion(parsedSuggestionId, user.id)
  return apiSuccess({ message: 'Suggestion ignored' })
})
