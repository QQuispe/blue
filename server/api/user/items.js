import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { getItemsByUserId } from '~/server/db/queries/items.js';

// Get connected items for the authenticated user
export default defineEventHandler(async (event) => {
  try {
    // Require authentication
    const user = await requireAuth(event);
    
    // Get all items for this user
    const items = await getItemsByUserId(user.id);
    
    // Don't return the encrypted access tokens to the frontend
    const safeItems = items.map(item => ({
      id: item.id,
      plaid_item_id: item.plaid_item_id,
      plaid_institution_id: item.plaid_institution_id,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
    
    return {
      statusCode: 200,
      items: safeItems,
    };
  } catch (error) {
    console.error('Error fetching user items:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch connected items',
    });
  }
});
