import { plaidClient } from "~/server/api/plaid/plaid";
import { defineEventHandler, readBody, createError } from 'h3';
import { getItemByPlaidItemId } from '~/server/db/queries/items.js';
import { createAccount } from '~/server/db/queries/accounts.js';
import { decrypt } from '~/server/utils/crypto.js';
import { requireAuth } from '~/server/utils/auth.js';
import { captureNetWorthSnapshot } from '~/server/utils/snapshots.js';

// Sync accounts for a specific item from Plaid
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);
  
  const body = await readBody(event);
  const { itemId } = body;

  if (!itemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing itemId. Please provide the plaid_item_id.'
    });
  }

  try {
    // Get item from database
    const item = await getItemByPlaidItemId(itemId);

    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item not found'
      });
    }
    
    // Verify ownership
    if (item.user_id !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      });
    }

    // Decrypt access token
    const accessToken = decrypt(item.plaid_access_token);

    // Fetch accounts from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;
    const itemData = accountsResponse.data.item;

    console.log(`Fetched ${accounts.length} accounts for item ${itemId}`);

    // Save accounts to database
    const savedAccounts = [];
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
      );
      savedAccounts.push(savedAccount);
    }

    // Capture net worth snapshot after accounts are synced
    try {
      await captureNetWorthSnapshot(user.id);
    } catch (snapshotError) {
      console.error('Failed to capture net worth snapshot:', snapshotError);
      // Don't fail the sync if snapshot fails
    }

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
    };

  } catch (error) {
    console.error('Error syncing accounts:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to sync accounts'
    });
  }
});
