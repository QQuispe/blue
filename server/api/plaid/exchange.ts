import { defineEventHandler, readBody, createError } from 'h3'
import { CountryCode } from 'plaid'
import { plaidClient } from '~/server/api/plaid/plaid'
import { requireAuth } from '~/server/utils/auth'
import { createItem, getItemByPlaidItemId } from '~/server/db/queries/items'
import { createAccount } from '~/server/db/queries/accounts'
import { encrypt } from '~/server/utils/crypto.js'
import { captureNetWorthSnapshot } from '~/server/utils/snapshots.js'
import type { User } from '~/types/database'

interface ExchangeBody {
  publicToken: string
}

interface ExchangeResponse {
  status: string
  itemId: string
  internalId: number
  institutionId: string
  accountsCreated: number
}

// API for exchanging the public token and persisting to database
export default defineEventHandler(async (event): Promise<ExchangeResponse> => {
  // Require authentication
  const user = await requireAuth(event)

  const body: ExchangeBody = await readBody(event)
  const { publicToken } = body

  if (!publicToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing public token',
    })
  }

  try {
    // Step 1: Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })
    const tokenData = tokenResponse.data
    const { access_token, item_id } = tokenData

    // Step 2: Get institution details from Plaid
    const itemResponse = await plaidClient.itemGet({
      access_token: access_token,
    })
    const institutionId = itemResponse.data.item.institution_id || 'unknown'

    // Step 3: Get institution name
    let institutionName = 'Unknown Institution'
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      })
      institutionName = instResponse.data.institution.name
    } catch (instError: any) {
      // Institution name fetch failed, using default
    }

    // Step 4: Encrypt the access token before storing
    const encryptedAccessToken = encrypt(access_token)

    // Step 5: Save to database with authenticated user ID
    const item = await createItem(
      user.id,
      encryptedAccessToken || '',
      item_id,
      institutionId,
      institutionName,
      'active' as const
    )

    // Step 6: Fetch accounts from Plaid for this new item
    let accountsCount = 0
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: access_token,
      })

      const accounts = accountsResponse.data.accounts

      for (const account of accounts) {
        await createAccount(
          item.id,
          account.account_id,
          account.name,
          account.mask || '',
          account.official_name || '',
          account.balances.current || 0,
          account.balances.available || null,
          account.balances.iso_currency_code || null,
          account.balances.unofficial_currency_code || null,
          account.type as 'depository' | 'credit' | 'loan' | 'investment' | 'other',
          account.subtype || null
        )
        accountsCount++
      }

      await captureNetWorthSnapshot(user.id)
    } catch (accountsError: any) {
      // Don't fail the exchange if accounts fetch fails - they'll be synced later
    }

    // Step 8: Return item info (do NOT return access token for security)
    return {
      status: 'success',
      itemId: item.plaid_item_id,
      internalId: item.id,
      institutionId: item.plaid_institution_id || '',
      accountsCreated: accountsCount,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Token exchange failed',
    })
  }
})
