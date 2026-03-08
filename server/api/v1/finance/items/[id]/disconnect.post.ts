import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getRouterParam } from 'h3'
import { disconnectItem } from '~/server/services/finance/items.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const itemId = getRouterParam(event, 'id')

  if (!itemId) {
    throw new Error('Item ID is required')
  }

  const parsedItemId = parseInt(itemId)
  if (isNaN(parsedItemId)) {
    throw new Error('Invalid item ID')
  }

  await disconnectItem(parsedItemId, user.id)
  return apiSuccess({ message: 'Item disconnected successfully' })
})
