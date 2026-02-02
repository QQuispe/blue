import { pool } from '~/server/db/index.js';

/**
 * Capture a net worth snapshot for a user
 * This creates or updates the snapshot for the current month
 * Past months are immutable, current month gets updated
 * 
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} The captured snapshot data
 */
export async function captureNetWorthSnapshot(userId) {
  const client = await pool.connect();
  
  try {
    // Get current date (first day of current month)
    const now = new Date();
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const snapshotDateStr = snapshotDate.toISOString().split('T')[0];
    
    // Get all accounts with their balances for this user
    const accountsResult = await client.query(
      `SELECT 
        a.current_balance
       FROM accounts a
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND i.status = 'active'`,
      [userId]
    );
    
    // Calculate net worth
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
    
    const netWorth = totalAssets - totalLiabilities;
    const accountCount = accountsResult.rows.length;
    
    // Insert or update snapshot for current month
    // Uses ON CONFLICT to update if snapshot already exists for this month
    const result = await client.query(
      `INSERT INTO net_worth_snapshots 
       (user_id, snapshot_date, total_assets, total_liabilities, net_worth, account_count, is_synthetic)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       ON CONFLICT (user_id, snapshot_date) 
       DO UPDATE SET
         total_assets = EXCLUDED.total_assets,
         total_liabilities = EXCLUDED.total_liabilities,
         net_worth = EXCLUDED.net_worth,
         account_count = EXCLUDED.account_count,
         is_synthetic = false
       RETURNING *`,
      [userId, snapshotDateStr, totalAssets, totalLiabilities, netWorth, accountCount]
    );
    
    console.log(`Net worth snapshot captured for user ${userId}:`, {
      date: snapshotDateStr,
      netWorth: netWorth.toFixed(2),
      accounts: accountCount
    });
    
    return {
      id: result.rows[0].id,
      userId,
      snapshotDate: snapshotDateStr,
      totalAssets,
      totalLiabilities,
      netWorth,
      accountCount,
      isSynthetic: false
    };
    
  } catch (error) {
    console.error('Error capturing net worth snapshot:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get the latest snapshot for a user
 * 
 * @param {number} userId - The user ID
 * @returns {Promise<Object|null>} The latest snapshot or null
 */
export async function getLatestSnapshot(userId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM net_worth_snapshots
       WHERE user_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 1`,
      [userId]
    );
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}
