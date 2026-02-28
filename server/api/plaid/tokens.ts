import { plaidClient } from '~/server/api/plaid/plaid'
import { Products, CountryCode } from 'plaid'

export default defineEventHandler(async event => {
  try {
    const body = await readBody(event)
    const userId = 'user' //getLoggedInUserId(event); // Replace with your user identification logic

    const userObject = { client_user_id: userId }
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: userObject,
      products: [Products.Transactions, Products.Liabilities],
      client_name: 'Blue',
      language: 'en',
      country_codes: [CountryCode.Us],
    })

    return tokenResponse.data
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error generating link token:', errorMessage)
    throw createError({
      statusCode: 500,
      statusMessage: 'Link token creation failed',
    })
  }
})
