import { pool } from '~/server/db/index'

export interface AdminStats {
  totalUsers: number
  totalBanks: number
  totalTransactions: number
  totalBills: number
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const [usersResult, banksResult, transactionsResult, billsResult] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM users'),
    pool.query('SELECT COUNT(*) as count FROM items WHERE status = $1', ['active']),
    pool.query('SELECT COUNT(*) as count FROM transactions'),
    pool.query('SELECT COUNT(*) as count FROM user_bills WHERE is_active = $1', [true]),
  ])

  return {
    totalUsers: parseInt(usersResult.rows[0].count),
    totalBanks: parseInt(banksResult.rows[0].count),
    totalTransactions: parseInt(transactionsResult.rows[0].count),
    totalBills: parseInt(billsResult.rows[0].count),
  }
}
