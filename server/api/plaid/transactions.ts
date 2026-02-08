import { plaidClient } from "~/server/api/plaid/plaid";
import { defineEventHandler, readBody, createError } from 'h3';
import { applyTransactionUpdates } from '~/server/db/queries/transactions.ts';
import { getItemByPlaidItemId } from '~/server/db/queries/items.ts';
import { decrypt } from '~/server/utils/crypto.js';
import { requireAuth } from '~/server/utils/auth.ts';

interface SyncBody {
  itemId: string;
}

interface SyncData {
  added: any[];
  removed: any[];
  modified: any[];
  nextCursor: string | null;
}

interface SyncResponse {
  statusCode: number;
  message: string;
  stats: {
    added: number;
    modified: number;
    removed: number;
    newCursor?: string;
  };
}

// Function to fetch ALL transactions from Plaid using cursor-based sync
const syncTransactionsFromPlaid = async (accessToken: string, cursor: string | null = null): Promise<SyncData> => {
  const allData: SyncData = { 
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
        cursor: allData.nextCursor || undefined,
      });

      const data = response.data;
      
      allData.added.push(...data.added);
      allData.modified.push(...data.modified);
      allData.removed.push(...data.removed);
      allData.nextCursor = data.next_cursor;
      hasMore = data.has_more;
    }

    return allData;
  } catch (error: any) {
    throw error;
  }
};

// Nuxt API route to handle transaction sync
export default defineEventHandler(async (event): Promise<SyncResponse> => {
  // Require authentication
  const user = await requireAuth(event);
  
  const body: SyncBody = await readBody(event);
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
    const syncData = await syncTransactionsFromPlaid(accessToken, item.transactions_cursor || undefined);

    // Step 4: Apply updates to database and save new cursor (atomic operation)
    const result = await applyTransactionUpdates(item.id, syncData);
    
    // Step 5: Update last_synced_at timestamp
    const { updateItemSync } = await import('~/server/db/queries/items.ts');
    await updateItemSync(item.id, syncData.nextCursor);

    return { 
      statusCode: 200,
      message: 'Sync completed successfully',
      stats: result
    };
    
  } catch (error: any) {
    console.error('Transaction sync failed:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to sync transactions'
    });
  }
});