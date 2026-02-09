import { pool } from '../index.js';
import type { Budget, QueryResult, QueryResultArray } from '~/types';

interface BudgetWithSpending {
  id: number;
  category: string;
  category_key: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  month: string;
  is_favorited?: boolean;
}

interface BudgetUpdates {
  amount?: number;
  isActive?: boolean;
  isFavorited?: boolean;
}

function deriveCategoryKey(category: string): string {
  return category
    .toUpperCase()
    .replace(/ & /g, '_AND_')
    .replace(/&/g, '_AND_')
    .replace(/ /g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

export async function budgetExists(
  userId: number,
  category: string,
  month?: string
): Promise<QueryResult<Budget>> {
  const categoryKey = deriveCategoryKey(category)
  const result = await pool.query(
    `SELECT * FROM budgets 
     WHERE user_id = $1 AND category_key = $2 AND is_active = true
     AND ($3 IS NULL OR month = $3)`,
    [userId, categoryKey, month || null]
  );
  return result.rows[0] || null;
}

export async function createBudget(
  userId: number, 
  category: string, 
  amount: number, 
  isFavorited: boolean = false,
  month: string = new Date().toISOString().slice(0, 7)
): Promise<Budget> {
  const categoryKey = deriveCategoryKey(category)
  const result = await pool.query(
    `INSERT INTO budgets (user_id, category, amount, is_favorited, month, category_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, category_key, month) DO UPDATE SET
       amount = EXCLUDED.amount,
       is_active = true,
       is_favorited = EXCLUDED.is_favorited,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, category, amount, isFavorited, month, categoryKey]
  );
  return result.rows[0];
}

export async function getBudgetsByUserId(userId: number, month?: string): Promise<QueryResultArray<Budget>> {
  const result = await pool.query(
    `SELECT * FROM budgets 
     WHERE user_id = $1 AND is_active = true
     AND ($2 IS NULL OR month = $2)
     ORDER BY category`,
    [userId, month || null]
  );
  return result.rows;
}

export async function getBudgetById(id: number): Promise<QueryResult<Budget>> {
  const result = await pool.query(
    `SELECT * FROM budgets WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

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

export async function getFavoritedCount(userId: number, month?: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM budgets 
     WHERE user_id = $1 AND is_favorited = true AND is_active = true
     AND ($2 IS NULL OR month = $2)`,
    [userId, month || null]
  );
  return parseInt(result.rows[0]?.count || '0');
}

export async function getBudgetsWithSpending(
  userId: number, 
  startDate: string, 
  endDate: string,
  month?: string
): Promise<QueryResultArray<BudgetWithSpending>> {
  const result = await pool.query(
    `SELECT 
        b.id,
        b.category,
        b.category_key,
        b.amount as budget_amount,
        b.is_favorited,
        b.month,
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
        AND t.plaid_category_id = b.category_key
        AND t.date >= $2
        AND t.date <= $3
        AND t.amount > 0
      WHERE b.user_id = $1 AND b.is_active = true
      AND (b.month = $4 OR $4 IS NULL)
      GROUP BY b.id, b.category, b.category_key, b.amount, b.is_favorited, b.month
      ORDER BY b.is_favorited DESC, percentage_used DESC`,
    [userId, startDate, endDate, month || null]
  );
  return result.rows;
}

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

export async function getBudgetMonths(userId: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT month FROM budgets 
     WHERE user_id = $1 AND is_active = true
     ORDER BY month DESC`,
    [userId]
  );
  return result.rows.map(row => row.month as string);
}
