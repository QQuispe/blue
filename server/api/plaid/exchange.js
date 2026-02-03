import { defineEventHandler, readBody, createError } from 'h3';
import { plaidClient } from "~/server/api/plaid/plaid";
import { requireAuth } from '~/server/utils/auth.js';
import { createItem, getItemByPlaidItemId } from '~/server/db/queries/items.ts';
import { createAccount } from '~/server/db/queries/accounts.ts';
import { encrypt } from '~/server/utils/crypto.js';
import { captureNetWorthSnapshot } from '~/server/utils/snapshots.js';

// API for exchanging the public token and persisting to database
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);
  
  const body = await readBody(event);
  const publicToken = body.publicToken;

  if (!publicToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing public token",
    });
  }

  try {
    // Step 1: Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const tokenData = tokenResponse.data;
    const { access_token, item_id } = tokenData;

    // Step 2: Get institution details from Plaid
    const itemResponse = await plaidClient.itemGet({
      access_token: access_token,
    });
    const institutionId = itemResponse.data.item.institution_id || 'unknown';

    // Step 3: Get institution name
    let institutionName = 'Unknown Institution';
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });
      institutionName = instResponse.data.institution.name;
    } catch (instError) {
      console.warn('Could not fetch institution name:', instError.message);
    }

    // Step 4: Encrypt the access token before storing
    const encryptedAccessToken = encrypt(access_token);

    // Step 5: Save to database with authenticated user ID
    const item = await createItem(
      user.id, // Use authenticated user ID
      encryptedAccessToken,
      item_id,
      institutionId,
      'active',
      institutionName
    );

    console.log("Item created successfully:", {
      userId: user.id,
      id: item.id,
      plaidItemId: item.plaid_item_id,
      institutionId: item.plaid_institution_id,
    });

    // Step 6: Fetch accounts from Plaid for this new item
    let accountsCount = 0;
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: access_token,
      });
      
      const accounts = accountsResponse.data.accounts;
      console.log(`Fetched ${accounts.length} accounts for new item ${item.plaid_item_id}`);
      
      // Save accounts to database
      for (const account of accounts) {
        await createAccount(
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
        );
        accountsCount++;
      }
      
      // Step 7: Capture net worth snapshot after accounts are created
      try {
        await captureNetWorthSnapshot(user.id);
        console.log('Net worth snapshot captured after adding new account');
      } catch (snapshotError) {
        console.error('Failed to capture net worth snapshot:', snapshotError);
      }
      
    } catch (accountsError) {
      console.error('Error fetching accounts for new item:', accountsError);
      // Don't fail the exchange if accounts fetch fails - they'll be synced later
    }

    // Step 8: Return item info (do NOT return access token for security)
    return {
      status: "success",
      itemId: item.plaid_item_id,
      internalId: item.id,
      institutionId: item.plaid_institution_id,
      accountsCreated: accountsCount,
    };
  } catch (error) {
    console.error("Error during token exchange:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Token exchange failed",
    });
  }
});
