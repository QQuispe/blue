import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { pool } from '~/server/db/index.js';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    
    // Get all accounts with their balances
    const result = await pool.query(
      `SELECT 
        a.id,
        a.name,
        a.type,
        a.subtype,
        a.current_balance,
        a.iso_currency_code,
        i.plaid_institution_id
       FROM accounts a
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND i.status = 'active'
       ORDER BY a.type, a.name`,
      [user.id]
    );
    
    // Categorize accounts
    const assets = [];
    const liabilities = [];
    
    result.rows.forEach(account => {
      const balance = parseFloat(account.current_balance) || 0;
      const accountData = {
        id: account.id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: balance,
        currency: account.iso_currency_code || 'USD'
      };
      
      // Classify as asset or liability based on balance and account type
      if (balance >= 0) {
        assets.push(accountData);
      } else {
        liabilities.push({
          ...accountData,
          balance: Math.abs(balance) // Store as positive for display
        });
      }
    });
    
    // Calculate totals
    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    return {
      statusCode: 200,
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        currency: 'USD',
        accountCount: result.rows.length
      },
      assets,
      liabilities
    };
    
  } catch (error) {
    console.error('Net worth error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to calculate net worth'
    });
  }
});
