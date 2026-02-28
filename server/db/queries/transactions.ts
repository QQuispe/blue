import { pool } from '../index.js'
import type { Transaction, QueryResult, QueryResultArray } from '~/types'
import type { SyncData, SyncResult } from '~/types'

// Transaction updates type
interface TransactionUpdates {
  plaidCategoryId?: string
  category?: string
  name?: string
  amount?: number
  date?: string
  pending?: boolean
}

// Transaction with account info (for getTransactionsByUserId)
interface TransactionWithAccount extends Transaction {
  account_name: string
  account_type: string
}

// Summary result type
interface TransactionsSummary {
  transaction_count: number
  total_amount: number
  active_days: number
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  accountId: number,
  plaidTransactionId: string,
  plaidCategoryId: string | null,
  category: string | null,
  type: string | null,
  name: string,
  amount: number,
  isoCurrencyCode: string | null,
  unofficialCurrencyCode: string | null,
  date: string,
  pending: boolean,
  accountOwner: string | null,
  pendingTransactionId: string | null = null
): Promise<QueryResult<Partial<Transaction>>> {
  const result = await pool.query(
    `INSERT INTO transactions (
      account_id, plaid_transaction_id, plaid_category_id, category,
      type, name, amount, iso_currency_code, unofficial_currency_code,
      date, pending, account_owner
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, plaid_transaction_id, name, amount, date, pending, created_at`,
    [
      accountId,
      plaidTransactionId,
      plaidCategoryId,
      category,
      type,
      name,
      amount,
      isoCurrencyCode,
      unofficialCurrencyCode,
      date,
      pending,
      accountOwner,
    ]
  )
  return result.rows[0]
}

/**
 * Get transaction by internal ID
 */
export async function getTransactionById(id: number): Promise<QueryResult<Transaction>> {
  const result = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [id])
  return result.rows[0] || null
}

/**
 * Get transaction by Plaid transaction ID
 */
export async function getTransactionByPlaidTransactionId(
  plaidTransactionId: string
): Promise<QueryResult<Transaction>> {
  const result = await pool.query(`SELECT * FROM transactions WHERE plaid_transaction_id = $1`, [
    plaidTransactionId,
  ])
  return result.rows[0] || null
}

/**
 * Get all transactions for an account
 */
export async function getTransactionsByAccountId(
  accountId: number,
  limit: number = 100,
  offset: number = 0
): Promise<QueryResultArray<Transaction>> {
  const result = await pool.query(
    `SELECT * FROM transactions 
     WHERE account_id = $1 
     ORDER BY date DESC, created_at DESC
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  )
  return result.rows
}

/**
 * Get all transactions for a user (across all accounts)
 */
export async function getTransactionsByUserId(
  userId: number,
  limit: number = 100,
  offset: number = 0
): Promise<QueryResultArray<TransactionWithAccount>> {
  const result = await pool.query(
    `SELECT t.*, a.name as account_name, a.type as account_type
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  return result.rows
}

/**
 * Update a transaction (for modified transactions from Plaid)
 */
export async function updateTransaction(
  plaidTransactionId: string,
  updates: TransactionUpdates
): Promise<QueryResult<Transaction>> {
  const fields: string[] = []
  const values: (string | number | boolean | null)[] = []
  let paramIndex = 1

  if (updates.plaidCategoryId !== undefined) {
    fields.push(`plaid_category_id = $${paramIndex++}`)
    values.push(updates.plaidCategoryId)
  }
  if (updates.category !== undefined) {
    fields.push(`category = $${paramIndex++}`)
    values.push(updates.category)
  }
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`)
    values.push(updates.name)
  }
  if (updates.amount !== undefined) {
    fields.push(`amount = $${paramIndex++}`)
    values.push(updates.amount)
  }
  if (updates.date !== undefined) {
    fields.push(`date = $${paramIndex++}`)
    values.push(updates.date)
  }
  if (updates.pending !== undefined) {
    fields.push(`pending = $${paramIndex++}`)
    values.push(updates.pending)
  }

  if (fields.length === 0) return null

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(plaidTransactionId)

  const result = await pool.query(
    `UPDATE transactions SET ${fields.join(', ')}
     WHERE plaid_transaction_id = $${paramIndex}
     RETURNING *`,
    values
  )
  return result.rows[0] || null
}

// Simple deletion result type
interface DeletedTransaction {
  id: number
  plaid_transaction_id: string
}

/**
 * Delete a transaction (for removed transactions from Plaid)
 */
export async function deleteTransaction(
  plaidTransactionId: string
): Promise<QueryResult<DeletedTransaction>> {
  const result = await pool.query(
    `DELETE FROM transactions WHERE plaid_transaction_id = $1
     RETURNING id, plaid_transaction_id`,
    [plaidTransactionId]
  )
  return result.rows[0] || null
}

/**
 * Apply transaction updates from Plaid sync to database
 * This runs in a database transaction for atomicity
 */
export async function applyTransactionUpdates(
  itemId: number,
  syncData: SyncData
): Promise<SyncResult> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { added, modified, removed, nextCursor } = syncData

    // 1. INSERT added transactions
    for (const transaction of added) {
      // First, get the internal account_id from the plaid_account_id
      const accountResult = await client.query(
        `SELECT id FROM accounts WHERE plaid_account_id = $1`,
        [transaction.account_id]
      )

      if (accountResult.rows.length === 0) {
        console.warn(`Account not found for plaid_account_id: ${transaction.account_id}`)
        continue
      }

      const accountId = accountResult.rows[0].id

      await client.query(
        `INSERT INTO transactions (
          account_id, plaid_transaction_id, plaid_category_id, category,
          type, name, amount, iso_currency_code, unofficial_currency_code,
          date, pending, account_owner, logo_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (plaid_transaction_id) DO UPDATE SET
          plaid_category_id = EXCLUDED.plaid_category_id,
          category = EXCLUDED.category,
          logo_url = EXCLUDED.logo_url,
          updated_at = CURRENT_TIMESTAMP`,
        [
          accountId,
          transaction.transaction_id,
          transaction.personal_finance_category?.primary,
          transaction.personal_finance_category?.detailed ||
            transaction.personal_finance_category?.primary,
          transaction.payment_channel,
          transaction.name,
          transaction.amount,
          transaction.iso_currency_code,
          transaction.unofficial_currency_code,
          transaction.date,
          transaction.pending,
          transaction.account_owner,
          transaction.logo_url,
        ]
      )
    }

    // 2. UPDATE modified transactions
    for (const transaction of modified) {
      await client.query(
        `UPDATE transactions SET
          plaid_category_id = $1,
          category = $2,
          name = $3,
          amount = $4,
          date = $5,
          pending = $6,
          logo_url = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE plaid_transaction_id = $8`,
        [
          transaction.personal_finance_category?.primary,
          transaction.personal_finance_category?.detailed ||
            transaction.personal_finance_category?.primary,
          transaction.name,
          transaction.amount,
          transaction.date,
          transaction.pending,
          transaction.logo_url,
          transaction.transaction_id,
        ]
      )
    }

    // 3. DELETE removed transactions
    for (const transaction of removed) {
      await client.query(`DELETE FROM transactions WHERE plaid_transaction_id = $1`, [
        transaction.transaction_id,
      ])
    }

    // 4. UPDATE cursor in items table (CRITICAL - only save after successful processing)
    await client.query(
      `UPDATE items 
       SET transactions_cursor = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [nextCursor, itemId]
    )

    await client.query('COMMIT')

    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      newCursor: nextCursor || undefined,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error applying transaction updates:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get stored cursor for an item
 */
export async function getTransactionCursor(itemId: number): Promise<string | null> {
  const result = await pool.query(`SELECT transactions_cursor FROM items WHERE id = $1`, [itemId])
  return result.rows[0]?.transactions_cursor || null
}

// Item with cursor result type
interface ItemWithCursor {
  id: number
  transactions_cursor: string | null
}

/**
 * Get item by access token (to find item_id for sync)
 */
export async function getItemByAccessToken(
  accessToken: string
): Promise<QueryResult<ItemWithCursor>> {
  const result = await pool.query(
    `SELECT id, transactions_cursor FROM items WHERE plaid_access_token = $1`,
    [accessToken]
  )
  return result.rows[0] || null
}

/**
 * Get recent transactions summary for dashboard
 */
export async function getRecentTransactionsSummary(
  userId: number,
  days: number = 30
): Promise<TransactionsSummary> {
  const result = await pool.query(
    `SELECT 
      COUNT(*) as transaction_count,
      COALESCE(SUM(amount), 0) as total_amount,
      COUNT(DISTINCT date) as active_days
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1 
       AND t.date >= CURRENT_DATE - INTERVAL '${days} days'
       AND NOT t.pending`,
    [userId]
  )
  return result.rows[0]
}

/**
 * Filter options for transactions
 */
export interface TransactionFilters {
  search?: string
  accountId?: number
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
  excludePending?: boolean
}

export interface TransactionSort {
  field: 'date' | 'amount' | 'name'
  direction: 'asc' | 'desc'
}

/**
 * Get filtered transactions with search, filter, and sort support
 */
export async function getFilteredTransactions(
  userId: number,
  filters: TransactionFilters,
  sort: TransactionSort,
  limit: number = 50,
  offset: number = 0
): Promise<QueryResultArray<TransactionWithAccount>> {
  let whereClause = `i.user_id = $1`
  const params: (string | number | boolean | null)[] = [userId]
  let paramIndex = 2

  if (filters.search) {
    whereClause += ` AND t.name ILIKE $${paramIndex}`
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.accountId) {
    whereClause += ` AND t.account_id = $${paramIndex}`
    params.push(filters.accountId)
    paramIndex++
  }

  if (filters.dateFrom) {
    whereClause += ` AND t.date >= $${paramIndex}`
    params.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    whereClause += ` AND t.date <= $${paramIndex}`
    params.push(filters.dateTo)
    paramIndex++
  }

  if (filters.minAmount !== undefined) {
    whereClause += ` AND ABS(t.amount) >= $${paramIndex}`
    params.push(filters.minAmount)
    paramIndex++
  }

  if (filters.maxAmount !== undefined) {
    whereClause += ` AND ABS(t.amount) <= $${paramIndex}`
    params.push(filters.maxAmount)
    paramIndex++
  }

  if (filters.excludePending !== false) {
    whereClause += ` AND NOT t.pending`
  }

  const sortField =
    sort.field === 'amount' ? 'ABS(t.amount)' : sort.field === 'name' ? 't.name' : 't.date'
  const sortDirection = sort.direction.toUpperCase()

  params.push(limit, offset)

  const result = await pool.query(
    `SELECT t.*, a.name as account_name, a.type as account_type
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE ${whereClause}
     ORDER BY ${sortField} ${sortDirection}, t.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )
  return result.rows
}

/**
 * Get filtered transaction count
 */
export async function getFilteredTransactionCount(
  userId: number,
  filters: TransactionFilters
): Promise<number> {
  let whereClause = `i.user_id = $1`
  const params: (string | number | boolean | null)[] = [userId]
  let paramIndex = 2

  if (filters.search) {
    whereClause += ` AND t.name ILIKE $${paramIndex}`
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.accountId) {
    whereClause += ` AND t.account_id = $${paramIndex}`
    params.push(filters.accountId)
    paramIndex++
  }

  if (filters.dateFrom) {
    whereClause += ` AND t.date >= $${paramIndex}`
    params.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    whereClause += ` AND t.date <= $${paramIndex}`
    params.push(filters.dateTo)
    paramIndex++
  }

  if (filters.minAmount !== undefined) {
    whereClause += ` AND ABS(t.amount) >= $${paramIndex}`
    params.push(filters.minAmount)
    paramIndex++
  }

  if (filters.maxAmount !== undefined) {
    whereClause += ` AND ABS(t.amount) <= $${paramIndex}`
    params.push(filters.maxAmount)
    paramIndex++
  }

  if (filters.excludePending !== false) {
    whereClause += ` AND NOT t.pending`
  }

  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE ${whereClause}`,
    params
  )
  return parseInt(result.rows[0].count)
}

/**
 * Get unique categories for a user
 */
export async function getUserCategories(userId: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT category
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1 AND category IS NOT NULL
     ORDER BY category`,
    [userId]
  )
  return result.rows.map(row => row.category as string)
}

/**
 * Get total spend for filtered transactions
 */
export async function getFilteredTotalSpend(
  userId: number,
  filters: TransactionFilters
): Promise<number> {
  let whereClause = `i.user_id = $1 AND t.amount < 0`
  const params: (string | number | boolean | null)[] = [userId]
  let paramIndex = 2

  if (filters.search) {
    whereClause += ` AND t.name ILIKE $${paramIndex}`
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.accountId) {
    whereClause += ` AND t.account_id = $${paramIndex}`
    params.push(filters.accountId)
    paramIndex++
  }

  if (filters.dateFrom) {
    whereClause += ` AND t.date >= $${paramIndex}`
    params.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    whereClause += ` AND t.date <= $${paramIndex}`
    params.push(filters.dateTo)
    paramIndex++
  }

  if (filters.excludePending !== false) {
    whereClause += ` AND NOT t.pending`
  }

  const result = await pool.query(
    `SELECT COALESCE(SUM(t.amount), 0) as total
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE ${whereClause}`,
    params
  )
  return parseFloat(result.rows[0].total)
}

/**
 * Get category breakdown for filtered transactions
 */
export async function getFilteredCategoryBreakdown(
  userId: number,
  filters: TransactionFilters
): Promise<{ category: string; amount: number; count: number }[]> {
  let whereClause = `i.user_id = $1 AND t.amount < 0`
  const params: (string | number | boolean | null)[] = [userId]
  let paramIndex = 2

  if (filters.search) {
    whereClause += ` AND t.name ILIKE $${paramIndex}`
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  if (filters.accountId) {
    whereClause += ` AND t.account_id = $${paramIndex}`
    params.push(filters.accountId)
    paramIndex++
  }

  if (filters.dateFrom) {
    whereClause += ` AND t.date >= $${paramIndex}`
    params.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    whereClause += ` AND t.date <= $${paramIndex}`
    params.push(filters.dateTo)
    paramIndex++
  }

  if (filters.excludePending !== false) {
    whereClause += ` AND NOT t.pending`
  }

  const result = await pool.query(
    `SELECT 
       COALESCE(t.category, 'Uncategorized') as category,
       SUM(t.amount) as amount,
       COUNT(*) as count
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE ${whereClause}
     GROUP BY category
     ORDER BY amount ASC`,
    params
  )
  return result.rows.map(row => ({
    category: row.category,
    amount: parseFloat(row.amount),
    count: parseInt(row.count),
  }))
}

export async function getTransactionMonths(userId: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1
     ORDER BY month DESC`,
    [userId]
  )
  return result.rows.map(row => row.month as string)
}
