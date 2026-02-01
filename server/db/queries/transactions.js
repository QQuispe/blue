import { pool } from '../index.js';

/**
 * Create a new transaction
 */
export async function createTransaction(
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
  pendingTransactionId = null
) {
  const result = await pool.query(
    `INSERT INTO transactions (
      account_id, plaid_transaction_id, plaid_category_id, category,
      type, name, amount, iso_currency_code, unofficial_currency_code,
      date, pending, account_owner
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, plaid_transaction_id, name, amount, date, pending, created_at`,
    [
      accountId, plaidTransactionId, plaidCategoryId, category,
      type, name, amount, isoCurrencyCode, unofficialCurrencyCode,
      date, pending, accountOwner
    ]
  );
  return result.rows[0];
}

/**
 * Get transaction by internal ID
 */
export async function getTransactionById(id) {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get transaction by Plaid transaction ID
 */
export async function getTransactionByPlaidTransactionId(plaidTransactionId) {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE plaid_transaction_id = $1`,
    [plaidTransactionId]
  );
  return result.rows[0] || null;
}

/**
 * Get all transactions for an account
 */
export async function getTransactionsByAccountId(accountId, limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT * FROM transactions 
     WHERE account_id = $1 
     ORDER BY date DESC, created_at DESC
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );
  return result.rows;
}

/**
 * Get all transactions for a user (across all accounts)
 */
export async function getTransactionsByUserId(userId, limit = 100, offset = 0) {
  const result = await pool.query(
    `SELECT t.*, a.name as account_name, a.type as account_type
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

/**
 * Update a transaction (for modified transactions from Plaid)
 */
export async function updateTransaction(
  plaidTransactionId,
  updates
) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.plaidCategoryId !== undefined) {
    fields.push(`plaid_category_id = $${paramIndex++}`);
    values.push(updates.plaidCategoryId);
  }
  if (updates.category !== undefined) {
    fields.push(`category = $${paramIndex++}`);
    values.push(updates.category);
  }
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.amount !== undefined) {
    fields.push(`amount = $${paramIndex++}`);
    values.push(updates.amount);
  }
  if (updates.date !== undefined) {
    fields.push(`date = $${paramIndex++}`);
    values.push(updates.date);
  }
  if (updates.pending !== undefined) {
    fields.push(`pending = $${paramIndex++}`);
    values.push(updates.pending);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(plaidTransactionId);

  const result = await pool.query(
    `UPDATE transactions SET ${fields.join(', ')}
     WHERE plaid_transaction_id = $${paramIndex}
     RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete a transaction (for removed transactions from Plaid)
 */
export async function deleteTransaction(plaidTransactionId) {
  const result = await pool.query(
    `DELETE FROM transactions WHERE plaid_transaction_id = $1
     RETURNING id, plaid_transaction_id`,
    [plaidTransactionId]
  );
  return result.rows[0] || null;
}

/**
 * Apply transaction updates from Plaid sync to database
 * This runs in a database transaction for atomicity
 */
export async function applyTransactionUpdates(itemId, syncData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { added, modified, removed, nextCursor } = syncData;
    
    // 1. INSERT added transactions
    for (const transaction of added) {
      // First, get the internal account_id from the plaid_account_id
      const accountResult = await client.query(
        `SELECT id FROM accounts WHERE plaid_account_id = $1`,
        [transaction.account_id]
      );
      
      if (accountResult.rows.length === 0) {
        console.warn(`Account not found for plaid_account_id: ${transaction.account_id}`);
        continue;
      }
      
      const accountId = accountResult.rows[0].id;
      
      await client.query(
        `INSERT INTO transactions (
          account_id, plaid_transaction_id, plaid_category_id, category,
          type, name, amount, iso_currency_code, unofficial_currency_code,
          date, pending, account_owner
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        [
          accountId,
          transaction.transaction_id,
          transaction.category_id,
          transaction.category?.join(', '),
          transaction.payment_channel,
          transaction.name,
          transaction.amount,
          transaction.iso_currency_code,
          transaction.unofficial_currency_code,
          transaction.date,
          transaction.pending,
          transaction.account_owner
        ]
      );
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
          updated_at = CURRENT_TIMESTAMP
        WHERE plaid_transaction_id = $7`,
        [
          transaction.category_id,
          transaction.category?.join(', '),
          transaction.name,
          transaction.amount,
          transaction.date,
          transaction.pending,
          transaction.transaction_id
        ]
      );
    }
    
    // 3. DELETE removed transactions
    for (const transaction of removed) {
      await client.query(
        `DELETE FROM transactions WHERE plaid_transaction_id = $1`,
        [transaction.transaction_id]
      );
    }
    
    // 4. UPDATE cursor in items table (CRITICAL - only save after successful processing)
    await client.query(
      `UPDATE items 
       SET transactions_cursor = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [nextCursor, itemId]
    );
    
    await client.query('COMMIT');
    
    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      newCursor: nextCursor
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying transaction updates:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get stored cursor for an item
 */
export async function getTransactionCursor(itemId) {
  const result = await pool.query(
    `SELECT transactions_cursor FROM items WHERE id = $1`,
    [itemId]
  );
  return result.rows[0]?.transactions_cursor || null;
}

/**
 * Get item by access token (to find item_id for sync)
 */
export async function getItemByAccessToken(accessToken) {
  const result = await pool.query(
    `SELECT id, transactions_cursor FROM items WHERE plaid_access_token = $1`,
    [accessToken]
  );
  return result.rows[0] || null;
}

/**
 * Get recent transactions summary for dashboard
 */
export async function getRecentTransactionsSummary(userId, days = 30) {
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
  );
  return result.rows[0];
}
