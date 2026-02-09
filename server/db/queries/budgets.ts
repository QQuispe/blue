import { pool } from '../index.js';
import type { Budget, QueryResult, QueryResultArray } from '~/types';

// Budget with spending data type
interface BudgetWithSpending {
  id: number;
  category: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  is_favorited?: boolean;
}

// Budget update input type
interface BudgetUpdates {
  amount?: number;
  isActive?: boolean;
  isFavorited?: boolean;
}

/**
 * Check if budget exists for user
 */
export async function budgetExists(
  userId: number,
  category: string
): Promise<QueryResult<Budget>> {
  const result = await pool.query(
    `SELECT * FROM budgets 
     WHERE user_id = $1 AND category = $2 AND is_active = true`,
    [userId, category]
  );
  return result.rows[0] || null;
}

/**
 * Create a new budget
 */
export async function createBudget(
  userId: number, 
  category: string, 
  amount: number, 
  isFavorited: boolean = false
): Promise<Budget> {
  const result = await pool.query(
    `INSERT INTO budgets (user_id, category, amount, is_favorited)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, category) DO UPDATE SET
       amount = EXCLUDED.amount,
       is_active = true,
       is_favorited = EXCLUDED.is_favorited,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, category, amount, isFavorited]
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
  const { amount, isActive, isFavorited } = updates;
  
  const result = await pool.query(
    `UPDATE budgets 
     SET amount = COALESCE($1, amount),
         is_active = COALESCE($2, is_active),
         is_favorited = COALESCE($3, is_favorited),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [amount, isActive, isFavorited, id]
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
 * Get favorited budgets count
 */
export async function getFavoritedCount(userId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM budgets 
     WHERE user_id = $1 AND is_favorited = true AND is_active = true`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0');
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
        b.is_favorited,
        COALESCE(SUM(t.amount), 0) as spent_amount,
        b.amount - COALESCE(SUM(t.amount), 0) as remaining_amount,
        CASE 
          WHEN b.amount > 0 THEN COALESCE(SUM(t.amount), 0) / b.amount * 100
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
      GROUP BY b.id, b.category, b.amount, b.is_favorited
      ORDER BY b.is_favorited DESC, percentage_used DESC`,
    [userId, startDate, endDate]
  );
  return result.rows;
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  id: number,
  isFavorited: boolean
): Promise<QueryResult<Budget>> {
  const result = await pool.query(
    `UPDATE budgets 
     SET is_favorited = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [isFavorited, id]
  );
  return result.rows[0] || null;
}
