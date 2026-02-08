import { defineEventHandler, createError, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth.ts';
import { pool } from '~/server/db/index.js';

interface NetWorthResponse {
  statusCode: number;
  current: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    accountCount: number;
    currency: string;
    percentageChange: number;
  };
  history: Array<{
    date: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  }>;
  timeframe: string;
}

export default defineEventHandler(async (event): Promise<NetWorthResponse> => {
  try {
    const user = await requireAuth(event);
    const query = getQuery(event);
    const timeframe = (query.timeframe as string) || '12m';
    
    const accountsResult = await pool.query(
      `SELECT 
        a.id,
        a.name,
        a.type,
        a.current_balance
       FROM accounts a
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND i.status = 'active'`,
      [user.id]
    );
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    accountsResult.rows.forEach(account => {
      const balance = parseFloat(account.current_balance) || 0;
      const accountType = account.type;
      
      if (accountType === 'depository' || accountType === 'investment') {
        totalAssets += balance;
      } else if (accountType === 'credit' || accountType === 'loan') {
        if (balance > 0) {
          totalLiabilities += balance;
        } else {
          totalAssets += Math.abs(balance);
        }
      } else {
        totalAssets += balance;
      }
    });
    
    const currentNetWorth = totalAssets - totalLiabilities;
    
    const startDate = new Date();
    
    switch (timeframe) {
      case '1m':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'ytd':
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - 10);
        break;
      case '12m':
      default:
        startDate.setMonth(startDate.getMonth() - 12);
        break;
    }
    
    const historyResult = await pool.query(
      `SELECT 
        snapshot_date as date,
        net_worth,
        total_assets,
        total_liabilities
       FROM net_worth_snapshots
       WHERE user_id = $1 
       AND snapshot_date >= $2
       ORDER BY snapshot_date ASC`,
      [user.id, startDate.toISOString().split('T')[0]]
    );
    
    const history = historyResult.rows;
    
    let percentageChange = 0;
    if (history.length >= 2) {
      const current = history[history.length - 1].net_worth;
      const previous = history[history.length - 2]?.net_worth || current;
      if (previous !== 0) {
        percentageChange = ((current - previous) / previous * 100);
      }
    }
    
    const formattedHistory = history.map(row => ({
      date: row.date,
      netWorth: parseFloat(row.net_worth),
      totalAssets: parseFloat(row.total_assets),
      totalLiabilities: parseFloat(row.total_liabilities)
    }));
    
    return {
      statusCode: 200,
      current: {
        netWorth: currentNetWorth,
        totalAssets,
        totalLiabilities,
        accountCount: accountsResult.rows.length,
        currency: 'USD',
        percentageChange: parseFloat(percentageChange.toFixed(2))
      },
      history: formattedHistory,
      timeframe
    };
    
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to calculate net worth'
    });
  }
});
