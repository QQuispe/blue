import { plaidClient } from '~/server/api/plaid/plaid'
import { defineEventHandler, readBody, createError } from 'h3'
import { getItemByPlaidItemId } from '~/server/db/queries/items'
import { createAccount } from '~/server/db/queries/accounts'
import { decrypt } from '~/server/utils/crypto.js'
import { requireAuth } from '~/server/utils/auth'
import { captureNetWorthSnapshot } from '~/server/utils/snapshots.js'

interface AccountsSyncBody {
  itemId: string
}

interface AccountsSyncResponse {
  statusCode: number
  message: string
  accounts: Array<{
    id: number
    name: string
    type: string
    current_balance: number
    available_balance: number
  }>
}

// Sync accounts for a specific item from Plaid
export default defineEventHandler(async (event): Promise<AccountsSyncResponse> => {
  // Require authentication
  const user = await requireAuth(event)

  const body: AccountsSyncBody = await readBody(event)
  const { itemId } = body

  if (!itemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing itemId. Please provide the plaid_item_id.',
    })
  }

  try {
    // Get item from database
    const item = await getItemByPlaidItemId(itemId)

    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item not found',
      })
    }

    // Verify ownership
    if (item.user_id !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied',
      })
    }

    // Decrypt access token
    const accessToken = decrypt(item.plaid_access_token)

    // Fetch accounts from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    const accounts = accountsResponse.data.accounts

    const savedAccounts = []
    for (const account of accounts) {
      const savedAccount = await createAccount(
        item.id,
        account.account_id,
        account.name,
        account.mask,
        account.official_name,
        account.balances.current,
        account.balances.available,
        account.balances.iso_currency_code,
        account.balances.unofficial_currency_code,
        account.type,
        account.subtype
      )
      savedAccounts.push(savedAccount)
    }

    await captureNetWorthSnapshot(user.id)

    return {
      statusCode: 200,
      message: 'Accounts synced successfully',
      accounts: savedAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        current_balance: acc.current_balance,
        available_balance: acc.available_balance,
      })),
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to sync accounts',
    })
  }
})
