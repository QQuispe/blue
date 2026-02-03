import { defineEventHandler, createError, getRequestURL, getMethod } from 'h3';
import { requireAuth } from '~/server/utils/auth.ts';
import { serverLogger } from '~/server/utils/logger.js';
import { getTotalBalanceForUser, getAccountsByUserId } from '~/server/db/queries/accounts.ts';

interface BalanceResponse {
  statusCode: number;
  summary: {
    totalCurrent: number;
    totalAvailable: number;
    accountCount: number;
    currency: string;
  };
  accounts: Array<{
    id: number;
    name: string;
    mask?: string;
    type: string;
    item_id: number;
    currentBalance: number;
    availableBalance: number;
    currency: string;
  }>;
}

// Get balance summary for the authenticated user
export default defineEventHandler(async (event): Promise<BalanceResponse> => {
  const startTime = Date.now();
  const url = getRequestURL(event);
  const method = getMethod(event);
  
  serverLogger.info(`→ ${method} ${url.pathname} - Starting request`);
  
  try {
    // Require authentication
    const user = await requireAuth(event);
    serverLogger.debug(`User authenticated: ${user.id}`);
    
    // Get total balance
    const balanceStart = Date.now();
    const balanceSummary = await getTotalBalanceForUser(user.id);
    serverLogger.db('getTotalBalanceForUser', Date.now() - balanceStart, 1);
    
    // Get accounts for breakdown
    const accountsStart = Date.now();
    const accounts = await getAccountsByUserId(user.id);
    serverLogger.db('getAccountsByUserId', Date.now() - accountsStart, accounts.length);
    
    // Format accounts for frontend
    const formattedAccounts = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      mask: acc.mask,
      type: acc.type,
      item_id: acc.item_id,
      currentBalance: acc.current_balance,
      availableBalance: acc.available_balance,
      currency: acc.iso_currency_code || 'USD'
    }));
    
    const duration = Date.now() - startTime;
    serverLogger.api(method, url.pathname, 200, duration, user.id);
    serverLogger.success(`Balance fetched for user ${user.id}`, {
      accountCount: formattedAccounts.length,
      totalBalance: balanceSummary.total_current
    });
    
    return {
      statusCode: 200,
      summary: {
        totalCurrent: parseFloat(balanceSummary.total_current) || 0,
        totalAvailable: parseFloat(balanceSummary.total_available) || 0,
        accountCount: parseInt(balanceSummary.account_count) || 0,
        currency: formattedAccounts[0]?.currency || 'USD'
      },
      accounts: formattedAccounts
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    serverLogger.api(method, url.pathname, error.statusCode || 500, duration);
    serverLogger.error(`Balance fetch failed: ${error.message}`, {
      stack: error.stack,
      statusCode: error.statusCode
    });
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch balance',
    });
  }
});