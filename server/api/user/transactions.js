import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { getTransactionsByUserId } from '~/server/db/queries/transactions.js';

// Get cached transactions for the authenticated user
export default defineEventHandler(async (event) => {
  try {
    // Require authentication
    const user = await requireAuth(event);
    
    // Get query params for pagination
    const query = getQuery(event);
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;
    
    // Get transactions from database
    const transactions = await getTransactionsByUserId(user.id, limit, offset);
    
    return {
      statusCode: 200,
      transactions: transactions,
      count: transactions.length,
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch transactions',
    });
  }
});
