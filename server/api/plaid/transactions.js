import { plaidClient } from "~/server/api/plaid/plaid";
import { defineEventHandler, readBody, createError } from 'h3';
import { applyTransactionUpdates } from '~/server/db/queries/transactions.js';
import { getItemByPlaidItemId } from '~/server/db/queries/items.js';
import { decrypt } from '~/server/utils/crypto.js';
import { requireAuth } from '~/server/utils/auth.js';

// Function to fetch ALL transactions from Plaid using cursor-based sync
const syncTransactionsFromPlaid = async (accessToken, cursor = null) => {
  const allData = { 
    added: [], 
    removed: [], 
    modified: [], 
    nextCursor: cursor 
  };

  let hasMore = true;
  
  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: allData.nextCursor,
      });

      const data = response.data;
      
      // DEBUG: Log first transaction to see what Plaid is sending
      if (data.added.length > 0 && !allData.nextCursor) {
        const sampleTxn = data.added[0];
        console.log('[DEBUG] Sample transaction from Plaid:', {
          name: sampleTxn.name,
          hasPersonalFinanceCategory: !!sampleTxn.personal_finance_category,
          personalFinanceCategory: sampleTxn.personal_finance_category,
          hasLogoUrl: !!sampleTxn.logo_url,
          logoUrl: sampleTxn.logo_url,
          hasMerchantName: !!sampleTxn.merchant_name,
          merchantName: sampleTxn.merchant_name,
          rawKeys: Object.keys(sampleTxn).slice(0, 20) // First 20 keys
        });
      }
      
      // Collect all changes
      allData.added.push(...data.added);
      allData.modified.push(...data.modified);
      allData.removed.push(...data.removed);
      allData.nextCursor = data.next_cursor;
      hasMore = data.has_more;

      console.log(
        `Sync page - Added: ${data.added.length}, Modified: ${data.modified.length}, Removed: ${data.removed.length}, Has more: ${hasMore}`
      );
    }

    return allData;
  } catch (error) {
    console.error('Error syncing transactions from Plaid:', error);
    
    // Handle specific Plaid error: mutation during pagination
    if (error.response?.data?.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
      console.error('Transaction data changed during pagination. Sync will retry from last saved cursor.');
    }
    
    throw error;
  }
};

// Nuxt API route to handle transaction sync
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event);
  
  const body = await readBody(event);
  const { itemId } = body;

  if (!itemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing itemId. Please provide the plaid_item_id to sync.'
    });
  }

  try {
    // Step 1: Get item from database with encrypted access token and cursor
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

    // Step 2: Decrypt the access token
    const accessToken = decrypt(item.plaid_access_token);

    // Step 3: Fetch all transaction updates from Plaid using cursor
    const syncData = await syncTransactionsFromPlaid(accessToken, item.transactions_cursor);

    // Step 4: Apply updates to database and save new cursor (atomic operation)
    const result = await applyTransactionUpdates(item.id, syncData);
    
    // Step 5: Update last_synced_at timestamp
    const { updateItemSync } = await import('~/server/db/queries/items.js');
    await updateItemSync(item.id, syncData.nextCursor);

    console.log('Transaction sync completed:', {
      userId: user.id,
      itemId: item.id,
      added: result.added,
      modified: result.modified,
      removed: result.removed,
      newCursor: result.newCursor ? 'saved' : 'null',
    });

    return { 
      statusCode: 200,
      message: 'Sync completed successfully',
      stats: result
    };
    
  } catch (error) {
    console.error('Transaction sync failed:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to sync transactions'
    });
  }
});