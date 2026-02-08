import { defineEventHandler, createError, deleteCookie } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { pool } from '~/server/db/index';

export default defineEventHandler(async (event) => {
  const client = await pool.connect();
  
  try {
    const user = await requireAuth(event);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Delete all user-related data in proper order (respecting foreign keys)
    
    // 1. Delete transactions (cascade from accounts will handle this)
    // 2. Delete accounts
    await client.query('DELETE FROM accounts WHERE item_id IN (SELECT id FROM items WHERE user_id = $1)', [user.id]);
    
    // 3. Delete items
    await client.query('DELETE FROM items WHERE user_id = $1', [user.id]);
    
    // 4. Delete bills
    await client.query('DELETE FROM user_bills WHERE user_id = $1', [user.id]);
    
    // 5. Delete detected patterns
    await client.query('DELETE FROM detected_bill_patterns WHERE user_id = $1', [user.id]);
    
    // 6. Delete net worth snapshots
    await client.query('DELETE FROM net_worth_snapshots WHERE user_id = $1', [user.id]);
    
    // 7. Finally, delete the user
    await client.query('DELETE FROM users WHERE id = $1', [user.id]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Clear auth cookie
    deleteCookie(event, 'auth_token');
    
    return {
      statusCode: 200,
      message: 'Account deleted successfully'
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete account'
    });
  } finally {
    client.release();
  }
});
