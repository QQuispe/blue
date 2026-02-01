import { defineEventHandler, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { pool } from '~/server/db/index.js';

// Get date range for current month
function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const { startDate, endDate } = getCurrentMonthRange();
    
    // Get spending by category
    const result = await pool.query(
      `SELECT 
        COALESCE(NULLIF(t.category, ''), 'Uncategorized') as category,
        SUM(ABS(t.amount)) as total_amount,
        COUNT(*) as transaction_count
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1
         AND t.date >= $2
         AND t.date <= $3
         AND t.amount > 0
         AND t.pending = false
       GROUP BY COALESCE(NULLIF(t.category, ''), 'Uncategorized')
       ORDER BY total_amount DESC`,
      [user.id, startDate, endDate]
    );
    
    // Calculate total spending
    const totalSpending = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);
    
    // Format categories with percentages
    const categories = result.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.total_amount),
      transactionCount: parseInt(row.transaction_count),
      percentage: totalSpending > 0 ? (parseFloat(row.total_amount) / totalSpending * 100).toFixed(1) : 0
    }));
    
    return {
      statusCode: 200,
      categories,
      totalSpending,
      period: { startDate, endDate }
    };
    
  } catch (error) {
    console.error('Spending by category error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch spending by category'
    });
  }
});
