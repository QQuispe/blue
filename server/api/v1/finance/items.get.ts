import { withErrorHandling } from '~/server/utils/errorHandler.js'
import { apiSuccess } from '~/server/utils/response.js'
import { requireAuth } from '~/server/utils/auth.js'
import { getQuery } from 'h3'
import { getItems, disconnectItem } from '~/server/services/finance/items.js'

export default withErrorHandling(async event => {
  const user = await requireAuth(event)
  const data = await getItems(user.id)
  return apiSuccess(data)
})
