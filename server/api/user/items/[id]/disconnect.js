import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { serverLogger } from '~/server/utils/logger.js';
import { getItemById, deleteItem } from '~/server/db/queries/items.ts';
import { plaidClient } from '~/server/api/plaid/plaid.js';
import { decrypt } from '~/server/utils/crypto.js';

// POST /api/user/items/:id/disconnect
export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  
  try {
    // Require authentication
    const user = await requireAuth(event);
    
    // Get item ID from URL
    const itemId = event.context.params?.id;
    
    if (!itemId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item ID required'
      });
    }
    
    serverLogger.info(`Disconnecting item ${itemId} for user ${user.id}`);
    
    // Get the item
    const item = await getItemById(parseInt(itemId));
    
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
    } catch (plaidError) {
      serverLogger.warn('Plaid unlink failed (item may already be removed)', {
        error: plaidError.message
      });
      // Continue - we still want to delete from our DB
    }
    
    // Delete from our database (cascades to accounts and transactions)
    await deleteItem(item.id);
    
    serverLogger.success(`Item ${itemId} disconnected`, {
      duration: Date.now() - startTime,
      userId: user.id
    });
    
    return {
      statusCode: 200,
      message: 'Bank connection removed successfully'
    };
    
  } catch (error) {
    serverLogger.error('Disconnect item failed', {
      error: error.message,
      stack: error.stack,
      userId: user?.id
    });
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to disconnect bank',
    });
  }
});
