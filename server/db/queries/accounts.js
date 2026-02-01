import { pool } from '../index.js';

/**
 * Create a new account
 */
export async function createAccount(
  itemId,
  plaidAccountId,
  name,
  mask,
  officialName,
  currentBalance,
  availableBalance,
  isoCurrencyCode,
  unofficialCurrencyCode,
  type,
  subtype
) {
  const result = await pool.query(
    `INSERT INTO accounts (
      item_id, plaid_account_id, name, mask, official_name,
      current_balance, available_balance, iso_currency_code,
      unofficial_currency_code, type, subtype
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (plaid_account_id) DO UPDATE SET
      name = EXCLUDED.name,
      mask = EXCLUDED.mask,
      official_name = EXCLUDED.official_name,
      current_balance = EXCLUDED.current_balance,
      available_balance = EXCLUDED.available_balance,
      iso_currency_code = EXCLUDED.iso_currency_code,
      unofficial_currency_code = EXCLUDED.unofficial_currency_code,
      type = EXCLUDED.type,
      subtype = EXCLUDED.subtype,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, item_id, plaid_account_id, name, current_balance, available_balance, type, created_at`,
    [
      itemId, plaidAccountId, name, mask, officialName,
      currentBalance, availableBalance, isoCurrencyCode,
      unofficialCurrencyCode, type, subtype
    ]
  );
  return result.rows[0];
}

/**
 * Get account by internal ID
 */
export async function getAccountById(id) {
  const result = await pool.query(
    `SELECT * FROM accounts WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get account by Plaid account ID
 */
export async function getAccountByPlaidAccountId(plaidAccountId) {
  const result = await pool.query(
    `SELECT * FROM accounts WHERE plaid_account_id = $1`,
    [plaidAccountId]
  );
  return result.rows[0] || null;
}

/**
 * Get all accounts for an item
 */
export async function getAccountsByItemId(itemId) {
  const result = await pool.query(
    `SELECT * FROM accounts WHERE item_id = $1 ORDER BY name`,
    [itemId]
  );
  return result.rows;
}

/**
 * Get all accounts for a user (across all items)
 */
export async function getAccountsByUserId(userId) {
  const result = await pool.query(
    `SELECT a.* FROM accounts a
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1
     ORDER BY a.name`,
    [userId]
  );
  return result.rows;
}

/**
 * Update account balances
 */
export async function updateAccountBalances(id, currentBalance, availableBalance) {
  const result = await pool.query(
    `UPDATE accounts 
     SET current_balance = $1, available_balance = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [currentBalance, availableBalance, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete an account
 */
export async function deleteAccount(id) {
  await pool.query(
    `DELETE FROM accounts WHERE id = $1`,
    [id]
  );
  return { deleted: true };
}

/**
 * Get total balance for a user
 */
export async function getTotalBalanceForUser(userId) {
  const result = await pool.query(
    `SELECT 
      COALESCE(SUM(a.current_balance), 0) as total_current,
      COALESCE(SUM(a.available_balance), 0) as total_available,
      COUNT(*) as account_count
     FROM accounts a
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1 AND i.status = 'active'`,
    [userId]
  );
  return result.rows[0];
}
