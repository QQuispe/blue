import { defineEventHandler, createError, getMethod, getRouterParam } from 'h3';
import { requireAuth } from '~/server/utils/auth.ts';
import { serverLogger } from '~/server/utils/logger.js';
import { 
  getItemsByUserId, 
  getItemById, 
  deleteItem,
  updateItemStatus 
} from '~/server/db/queries/items.ts';
import { plaidClient } from '~/server/api/plaid/plaid.js';
import { decrypt } from '~/server/utils/crypto.js';

interface ItemsResponse {
  statusCode: number;
  items?: Array<{
    id: number;
    plaid_item_id: string;
    plaid_institution_id: string;
    institution_name: string;
    status: string;
    error?: any;
    created_at: Date;
    updated_at: Date;
    last_synced_at: Date;
  }>;
  message?: string;
}

interface DisconnectResponse {
  statusCode: number;
  message: string;
}

// Get connected items for authenticated user OR disconnect an item
export default defineEventHandler(async (event): Promise<ItemsResponse | DisconnectResponse> => {
  const startTime = Date.now();
  const method = getMethod(event);
  let user = null;
  
  try {
    // Require authentication
    user = await requireAuth(event);
    
    // Handle POST request (disconnect)
    if (method === 'POST') {
      const itemId = getRouterParam(event, 'id');
      
      if (!itemId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Item ID required'
        });
      }
      
      serverLogger.info(`Disconnecting item ${itemId} for user ${user.id}`);
      
      // Get the item
      const item = await getItemById(itemId);
      
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
      
      try {
        // Try to unlink from Plaid (optional - don't fail if Plaid errors)
        const accessToken = decrypt(item.plaid_access_token);
        await plaidClient.itemRemove({
          access_token: accessToken
        });
        serverLogger.success('Plaid item removed successfully');
      } catch (plaidError: any) {
        serverLogger.warn('Plaid unlink failed (item may already be removed)', {
          error: plaidError.message
        });
        // Continue - we still want to delete from our DB
      }
      
      // Delete from our database
      await deleteItem(itemId);
      
      serverLogger.success(`Item ${itemId} disconnected`, {
        duration: Date.now() - startTime
      });
      
      return {
        statusCode: 200,
        message: 'Item disconnected successfully'
      };
    }
    
    // Handle GET request (list items)
    // Get all items for this user
    const items = await getItemsByUserId(user.id);
    
    // Get accounts to extract institution names
    const { getAccountsByUserId } = await import('~/server/db/queries/accounts.ts');
    const accounts = await getAccountsByUserId(user.id);
    
    // Create a map of item_id to institution_name
    const institutionMap: Record<number, string> = {};
    accounts.forEach(account => {
      if (account.institution_name && !institutionMap[account.item_id]) {
        institutionMap[account.item_id] = account.institution_name;
      }
    });
    
    // Don't return the encrypted access tokens to the frontend
    const safeItems = items.map(item => ({
      id: item.id,
      plaid_item_id: item.plaid_item_id,
      plaid_institution_id: item.plaid_institution_id,
      institution_name: institutionMap[item.id] || item.plaid_institution_id,
      status: item.status,
      error: item.error || null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      last_synced_at: item.updated_at // Using updated_at as proxy for last sync
    }));
    
    serverLogger.api('GET', '/api/user/items', 200, Date.now() - startTime, user.id);
    
    return {
      statusCode: 200,
      items: safeItems,
    };
  } catch (error: any) {
    serverLogger.error('Items API error', {
      error: error.message,
      method,
      userId: user?.id
    });
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process request',
    });
  }
});