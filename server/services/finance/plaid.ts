import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'
import { encrypt } from '~/server/utils/crypto.js'
import { createItem } from '~/server/db/queries/items.js'
import { createAccount } from '~/server/db/queries/accounts.js'
import { captureNetWorthSnapshot } from './snapshots.js'

const configuration = new Configuration({
  basePath:
    PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] ||
    PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export interface LinkTokenData {
  link_token: string
}

export interface ExchangeData {
  status: string
  itemId: string
  internalId: number
  institutionId: string
  accountsCreated: number
}

export async function createLinkToken(): Promise<LinkTokenData> {
  const userId = 'user' // Placeholder - actual auth happens at API layer
  const userObject = { client_user_id: userId }

  const tokenResponse = await plaidClient.linkTokenCreate({
    user: userObject,
    products: [Products.Transactions, Products.Liabilities],
    client_name: 'Blue',
    language: 'en',
    country_codes: [CountryCode.Us],
  })

  return { link_token: tokenResponse.data.link_token }
}

export async function exchangePublicToken(
  publicToken: string,
  userId: number
): Promise<ExchangeData> {
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
    userId,
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

    await captureNetWorthSnapshot(userId)
  } catch (accountsError: any) {
    // Don't fail the exchange if accounts fetch fails - they'll be synced later
  }

  return {
    status: 'success',
    itemId: item.plaid_item_id,
    internalId: item.id,
    institutionId: item.institution_id || '',
    accountsCreated: accountsCount,
  }
}
