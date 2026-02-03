import { defineEventHandler, createError, getQuery, getRequestURL, getMethod } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { serverLogger } from '~/server/utils/logger.js';
import { getTransactionsByUserId, getTransactionsByAccountId } from '~/server/db/queries/transactions.ts';
import { getAccountById } from '~/server/db/queries/accounts.ts';

// Get cached transactions for the authenticated user
export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  const url = getRequestURL(event);
  const method = getMethod(event);
  
  // Get query params early for error logging
  const query = getQuery(event);
  const accountId = query.accountId ? parseInt(query.accountId) : null;
  
  serverLogger.info(`→ ${method} ${url.pathname}${url.search} - Starting request`);
  
  try {
    // Require authentication
    const user = await requireAuth(event);
    
    // Get query params for pagination and filtering
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;
    const accountIdParsed = accountId;
    
    serverLogger.debug(`Transaction query params`, { limit, offset, accountId: accountIdParsed });
    
    let transactions;
    
    if (accountId) {
      serverLogger.info(`Fetching transactions for account ${accountId}`);
      
      // Verify account belongs to user
      const accountStart = Date.now();
      const account = await getAccountById(accountId);
      serverLogger.db('getAccountById', Date.now() - accountStart, account ? 1 : 0);
      
      if (!account) {
        serverLogger.error(`Account not found: ${accountId}`);
        throw createError({
          statusCode: 404,
          statusMessage: 'Account not found'
        });
      }
      
      // Get item to verify ownership
      const itemStart = Date.now();
      const { getItemById } = await import('~/server/db/queries/items.ts');
      const item = await getItemById(account.item_id);
      serverLogger.db('getItemById', Date.now() - itemStart, item ? 1 : 0);
      
      if (!item || item.user_id !== user.id) {
        serverLogger.error(`Access denied - User ${user.id} attempted to access account ${accountId} owned by ${item?.user_id || 'unknown'}`);
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied'
        });
      }
      
      const txStart = Date.now();
      transactions = await getTransactionsByAccountId(accountId, limit, offset);
      serverLogger.db('getTransactionsByAccountId', Date.now() - txStart, transactions.length);
    } else {
      serverLogger.info(`Fetching all transactions for user ${user.id}`);
      
      const txStart = Date.now();
      transactions = await getTransactionsByUserId(user.id, limit, offset);
      serverLogger.db('getTransactionsByUserId', Date.now() - txStart, transactions.length);
    }
    
    const duration = Date.now() - startTime;
    serverLogger.api(method, url.pathname, 200, duration, user.id);
    serverLogger.success(`Transactions fetched`, {
      accountId: accountId || 'all',
      count: transactions.length,
      limit,
      offset
    });
    
    return {
      statusCode: 200,
      transactions: transactions,
      count: transactions.length,
      accountId: accountId || null
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration);
    serverLogger.error(`Transaction fetch failed: ${error.message}`, {
      stack: error.stack,
      statusCode: error.statusCode,
      accountId: query.accountId
    });
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch transactions',
    });
  }
});
