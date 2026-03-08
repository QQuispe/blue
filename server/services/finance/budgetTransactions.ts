import { pool } from '~/server/db/index.js'

export interface BudgetTransaction {
  id: number
  name: string
  amount: number
  date: string
  account_name?: string
}

export interface BudgetTransactionsData {
  transactions: BudgetTransaction[]
}

function deriveCategoryKey(category: string): string {
  return category
    .toUpperCase()
    .replace(/ & /g, '_AND_')
    .replace(/&/g, '_AND_')
    .replace(/ /g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

export async function getBudgetTransactions(
  userId: number,
  category: string,
  startDate: string,
  endDate: string
): Promise<BudgetTransactionsData> {
  const categoryKey = deriveCategoryKey(category)

  const result = await pool.query(
    `SELECT 
        t.id,
        t.name,
        t.amount,
        t.date,
        a.name as account_name
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1 
       AND t.plaid_category_id = $2
       AND t.date >= $3
       AND t.date <= $4
       AND t.amount > 0
     ORDER BY t.date DESC, t.created_at DESC`,
    [userId, categoryKey, startDate, endDate]
  )

  return {
    transactions: result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      date: row.date,
      account_name: row.account_name,
    })),
  }
}
