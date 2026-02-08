import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { pool } from '~/server/db/index';

interface AdminStats {
  totalUsers: number;
  totalBanks: number;
  totalTransactions: number;
  totalBills: number;
}

export default defineEventHandler(async (event): Promise<AdminStats> => {
  try {
    const user = await requireAuth(event);
    
    // Check if user is admin
    if (!user.is_admin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied. Admin only.'
      });
    }

    // Get counts in parallel
    const [
      usersResult,
      banksResult,
      transactionsResult,
      billsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM items WHERE status = $1', ['active']),
      pool.query('SELECT COUNT(*) as count FROM transactions'),
      pool.query('SELECT COUNT(*) as count FROM user_bills WHERE is_active = $1', [true])
    ]);

    return {
      totalUsers: parseInt(usersResult.rows[0].count),
      totalBanks: parseInt(banksResult.rows[0].count),
      totalTransactions: parseInt(transactionsResult.rows[0].count),
      totalBills: parseInt(billsResult.rows[0].count)
    };

  } catch (error: any) {
    if (error.statusCode === 403) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch admin stats'
    });
  }
});
