import { pool } from '~/server/db/index';

// Define types
interface SnapshotData {
  id: number;
  user_id: number;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  account_count: number;
  is_synthetic: boolean;
  created_at?: Date;
}

interface NetWorthResult {
  id: number;
  userId: number;
  snapshotDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountCount: number;
  isSynthetic: boolean;
}

/**
 * Capture a net worth snapshot for a user
 * This creates or updates the snapshot for the current month
 * Past months are immutable, current month gets updated
 */
export async function captureNetWorthSnapshot(userId: number): Promise<NetWorthResult> {
  const client = await pool.connect();
  
  try {
    // Get current date (first day of current month)
    const now = new Date();
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const snapshotDateStr = snapshotDate.toISOString().split('T')[0];
    
    // Get all accounts with their balances and types for this user
    const accountsResult = await client.query(
      `SELECT 
        a.current_balance,
        a.type
       FROM accounts a
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND i.status = 'active'`,
      [userId]
    );
    
    // Calculate net worth based on account types (matching net worth API logic)
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    accountsResult.rows.forEach(account => {
      const balance = parseFloat(account.current_balance) || 0;
      const accountType = account.type;
      
      // Assets: depository (checking/savings) and investment accounts
      if (accountType === 'depository' || accountType === 'investment') {
        totalAssets += balance;
      }
      // Liabilities: credit cards and loans (treat positive balance as debt)
      else if (accountType === 'credit' || accountType === 'loan') {
        if (balance > 0) {
          totalLiabilities += balance;
        } else {
          totalAssets += Math.abs(balance); // Overpayment is an asset
        }
      }
      // Other account types: treat as assets
      else {
        totalAssets += balance;
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
 */
export async function getLatestSnapshot(userId: number): Promise<SnapshotData | null> {
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