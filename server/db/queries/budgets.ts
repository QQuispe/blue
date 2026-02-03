import { pool } from '../index.js';
import type { Budget, QueryResult, QueryResultArray } from '~/types';

// Budget with spending data type
interface BudgetWithSpending {
  id: number;
  category: string;
  budget_amount: number;
  period: string;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

// Budget update input type
interface BudgetUpdates {
  amount?: number;
  period?: Budget['period'];
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

/**
 * Create a new budget
 */
export async function createBudget(
  userId: number, 
  category: string, 
  amount: number, 
  period: Budget['period'] = 'monthly', 
  startDate: string, 
  endDate: string | null = null
): Promise<Budget> {
  const result = await pool.query(
    `INSERT INTO budgets (user_id, category, amount, period, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, category, period) DO UPDATE SET
       amount = EXCLUDED.amount,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       is_active = true,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, category, amount, period, startDate, endDate]
  );
  return result.rows[0];
}

/**
 * Get all budgets for a user
 */
export async function getBudgetsByUserId(userId: number): Promise<QueryResultArray<Budget>> {
  const result = await pool.query(
    `SELECT * FROM budgets 
     WHERE user_id = $1 AND is_active = true
     ORDER BY category`,
    [userId]
  );
  return result.rows;
}

/**
 * Get budget by ID
 */
export async function getBudgetById(id: number): Promise<QueryResult<Budget>> {
  const result = await pool.query(
    `SELECT * FROM budgets WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update a budget
 */
export async function updateBudget(
  id: number, 
  updates: BudgetUpdates
): Promise<QueryResult<Budget>> {
  const { amount, period, startDate, endDate, isActive } = updates;
  
  const result = await pool.query(
    `UPDATE budgets 
     SET amount = COALESCE($1, amount),
         period = COALESCE($2, period),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date),
         is_active = COALESCE($5, is_active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [amount, period, startDate, endDate, isActive, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete (soft delete) a budget
 */
export async function deleteBudget(id: number): Promise<QueryResult<Budget>> {
  const result = await pool.query(
    `UPDATE budgets 
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get budgets with spending data
 */
export async function getBudgetsWithSpending(
  userId: number, 
  startDate: string, 
  endDate: string
): Promise<QueryResultArray<BudgetWithSpending>> {
  const result = await pool.query(
    `SELECT 
       b.id,
       b.category,
       b.amount as budget_amount,
       b.period,
       COALESCE(SUM(t.amount), 0) as spent_amount,
       b.amount - COALESCE(SUM(t.amount), 0) as remaining_amount,
       CASE 
         WHEN b.amount > 0 THEN (COALESCE(SUM(t.amount), 0) / b.amount * 100)
         ELSE 0 
       END as percentage_used
     FROM budgets b
     LEFT JOIN accounts a ON a.item_id IN (
       SELECT id FROM items WHERE user_id = $1
     )
     LEFT JOIN transactions t ON t.account_id = a.id 
       AND t.category = b.category
       AND t.date >= $2
       AND t.date <= $3
       AND t.amount > 0
     WHERE b.user_id = $1 AND b.is_active = true
     GROUP BY b.id, b.category, b.amount, b.period
     ORDER BY percentage_used DESC`,
    [userId, startDate, endDate]
  );
  return result.rows;
}
