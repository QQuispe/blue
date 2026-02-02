import { defineEventHandler, createError, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { pool } from '~/server/db/index.js';

// DEV ONLY: Generate synthetic historical data for testing
// TODO: Remove this entire function before production release
function generateSyntheticHistory(currentNetWorth, monthsBack = 12) {
  const data = [];
  let runningValue = currentNetWorth * (0.75 + Math.random() * 0.15); // Start 75-90% of current
  
  for (let i = monthsBack; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1); // First day of month
    
    // Add realistic monthly fluctuation (-3% to +6%)
    const change = (Math.random() * 0.09) - 0.03;
    runningValue = runningValue * (1 + change);
    
    data.push({
      date: date.toISOString().split('T')[0],
      netWorth: runningValue,
      isSynthetic: true
    });
  }
  
  // Ensure last point matches current
  data[data.length - 1].netWorth = currentNetWorth;
  
  return data;
}

// DEV ONLY: Save synthetic snapshots to database
// TODO: Remove this entire function before production release
async function saveSyntheticSnapshots(userId, syntheticData) {
  const client = await pool.connect();
  try {
    for (const snapshot of syntheticData) {
      // Calculate fake assets/liabilities based on net worth
      const totalAssets = snapshot.netWorth * (1.2 + Math.random() * 0.3);
      const totalLiabilities = totalAssets - snapshot.netWorth;
      
      await client.query(
        `INSERT INTO net_worth_snapshots 
         (user_id, snapshot_date, total_assets, total_liabilities, net_worth, account_count, is_synthetic)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, snapshot_date) DO NOTHING`,
        [
          userId,
          snapshot.date,
          Math.max(0, totalAssets),
          Math.max(0, totalLiabilities),
          snapshot.netWorth,
          Math.floor(Math.random() * 5) + 2, // Random 2-6 accounts
          true
        ]
      );
    }
  } finally {
    client.release();
  }
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const query = getQuery(event);
    const timeframe = query.timeframe || '12m'; // Default to 12 months
    
    // Get current account balances
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
    
    // Calculate current net worth
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    accountsResult.rows.forEach(account => {
      const balance = parseFloat(account.current_balance) || 0;
      if (balance >= 0) {
        totalAssets += balance;
      } else {
        totalLiabilities += Math.abs(balance);
      }
    });
    
    const currentNetWorth = totalAssets - totalLiabilities;
    
    // Calculate date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    let monthsToGenerate = 12;
    
    switch (timeframe) {
      case '1m':
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        monthsToGenerate = 2; // Need at least 2 data points for comparison
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        monthsToGenerate = 4;
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        monthsToGenerate = 7;
        break;
      case 'ytd':
        startDate.setMonth(0);
        startDate.setDate(1);
        monthsToGenerate = new Date().getMonth() + 1;
        break;
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - 10); // Max 10 years
        monthsToGenerate = 120;
        break;
      case '12m':
      default:
        startDate.setMonth(startDate.getMonth() - 12);
        monthsToGenerate = 13;
        break;
    }
    
    // Get historical snapshots - always include the most recent snapshot even if outside range
    const historyResult = await pool.query(
      `SELECT 
        snapshot_date as date,
        net_worth,
        total_assets,
        total_liabilities,
        is_synthetic
       FROM net_worth_snapshots
       WHERE user_id = $1 
       AND snapshot_date >= $2
       ORDER BY snapshot_date ASC`,
      [user.id, startDate.toISOString().split('T')[0]]
    );
    
    let history = historyResult.rows;
    const hasExistingHistory = history.length > 0;
    
    // DEV ONLY: Generate and save synthetic data if no history exists
    // TODO: Remove this entire block before production release
    if (!hasExistingHistory && process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Generating synthetic net worth history for testing...');
      const syntheticData = generateSyntheticHistory(currentNetWorth, monthsToGenerate);
      await saveSyntheticSnapshots(user.id, syntheticData);
      
      // Re-fetch to include the synthetic data we just saved
      const updatedResult = await pool.query(
        `SELECT 
          snapshot_date as date,
          net_worth,
          total_assets,
          total_liabilities,
          is_synthetic
         FROM net_worth_snapshots
         WHERE user_id = $1 
         AND snapshot_date >= $2
         ORDER BY snapshot_date ASC`,
        [user.id, startDate.toISOString().split('T')[0]]
      );
      history = updatedResult.rows;
    }
    
    // Calculate percentage change from previous month
    let percentageChange = 0;
    if (history.length >= 2) {
      const current = history[history.length - 1].net_worth;
      const previous = history[history.length - 2]?.net_worth || current;
      if (previous !== 0) {
        percentageChange = ((current - previous) / previous * 100);
      }
    }
    
    // Format history for chart
    const formattedHistory = history.map(row => ({
      date: row.date,
      netWorth: parseFloat(row.net_worth),
      totalAssets: parseFloat(row.total_assets),
      totalLiabilities: parseFloat(row.total_liabilities),
      isSynthetic: row.is_synthetic
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
      timeframe,
      hasSyntheticData: formattedHistory.some(h => h.isSynthetic)
    };
    
  } catch (error) {
    console.error('Net worth error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to calculate net worth'
    });
  }
});
