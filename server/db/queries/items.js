import { pool } from '../index.js';

/**
 * Create a new Plaid item (bank connection)
 */
export async function createItem(userId, plaidAccessToken, plaidItemId, plaidInstitutionId, institutionName, status = 'active') {
  const result = await pool.query(
    `INSERT INTO items (user_id, plaid_access_token, plaid_item_id, plaid_institution_id, institution_name, status, transactions_cursor)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, plaid_item_id, plaid_institution_id, institution_name, status, transactions_cursor, last_synced_at, error, created_at`,
    [userId, plaidAccessToken, plaidItemId, plaidInstitutionId, institutionName, status, null]
  );
  return result.rows[0];
}

/**
 * Get item by internal ID
 */
export async function getItemById(id) {
  const result = await pool.query(
    `SELECT id, user_id, plaid_access_token, plaid_item_id, plaid_institution_id, institution_name, status, transactions_cursor, last_synced_at, error, created_at, updated_at
     FROM items WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get item by Plaid item ID
 */
export async function getItemByPlaidItemId(plaidItemId) {
  const result = await pool.query(
    `SELECT id, user_id, plaid_access_token, plaid_item_id, plaid_institution_id, institution_name, status, transactions_cursor, last_synced_at, error, created_at, updated_at
     FROM items WHERE plaid_item_id = $1`,
    [plaidItemId]
  );
  return result.rows[0] || null;
}

/**
 * Get item by access token (for transaction sync)
 */
export async function getItemByAccessToken(accessToken) {
  const result = await pool.query(
    `SELECT id, user_id, plaid_access_token, plaid_item_id, plaid_institution_id, institution_name, status, transactions_cursor, last_synced_at, error, created_at, updated_at
     FROM items WHERE plaid_access_token = $1`,
    [accessToken]
  );
  return result.rows[0] || null;
}

/**
 * Get all items for a user
 */
export async function getItemsByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, plaid_item_id, plaid_institution_id, institution_name, status, transactions_cursor, last_synced_at, error, created_at, updated_at
     FROM items WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Update transaction cursor for an item
 */
export async function updateItemCursor(id, cursor) {
  const result = await pool.query(
    `UPDATE items SET transactions_cursor = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, transactions_cursor, updated_at`,
    [cursor, id]
  );
  return result.rows[0] || null;
}

/**
 * Update item status
 */
export async function updateItemStatus(id, status) {
  const result = await pool.query(
    `UPDATE items SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, status, updated_at`,
    [status, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete an item (cascades to accounts and transactions)
 */
export async function deleteItem(id) {
  await pool.query(
    `DELETE FROM items WHERE id = $1`,
    [id]
  );
  return { deleted: true };
}

/**
 * Get all active items (for scheduled sync)
 */
export async function getActiveItems() {
  const result = await pool.query(
    `SELECT id, user_id, plaid_access_token, plaid_item_id, plaid_institution_id, institution_name, transactions_cursor, last_synced_at, error
     FROM items WHERE status = 'active'`,
    []
  );
  return result.rows;
}

/**
 * Update item sync info (cursor, last_synced_at, clear error)
 */
export async function updateItemSync(id, cursor) {
  const result = await pool.query(
    `UPDATE items SET transactions_cursor = $1, last_synced_at = CURRENT_TIMESTAMP, error = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, transactions_cursor, last_synced_at, error, updated_at`,
    [cursor, id]
  );
  return result.rows[0] || null;
}

/**
 * Update item error status
 */
export async function updateItemError(id, errorMessage) {
  const result = await pool.query(
    `UPDATE items SET error = $1, status = 'error', updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, error, status, updated_at`,
    [errorMessage, id]
  );
  return result.rows[0] || null;
}
