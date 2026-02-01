import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { getTotalBalanceForUser, getAccountsByUserId } from '~/server/db/queries/accounts.js';

// Get balance summary for the authenticated user
export default defineEventHandler(async (event) => {
  try {
    // Require authentication
    const user = await requireAuth(event);
    
    // Get total balance
    const balanceSummary = await getTotalBalanceForUser(user.id);
    
    // Get accounts for breakdown
    const accounts = await getAccountsByUserId(user.id);
    
    // Format accounts for frontend
    const formattedAccounts = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      mask: acc.mask,
      type: acc.type,
      currentBalance: acc.current_balance,
      availableBalance: acc.available_balance,
      currency: acc.iso_currency_code || 'USD'
    }));
    
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
  } catch (error) {
    console.error('Error fetching user balance:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch balance',
    });
  }
});
