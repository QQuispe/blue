import { defineEventHandler, createError, getRouterParam, readBody } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { serverLogger } from '~/server/utils/logger';
import { pool } from '~/server/db/index';

export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  
  try {
    const user = await requireAuth(event);
    const billId = getRouterParam(event, 'id');
    
    if (!billId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bill ID is required'
      });
    }

    // Verify bill belongs to user
    const existingBill = await pool.query(
      'SELECT id FROM user_bills WHERE id = $1 AND user_id = $2',
      [billId, user.id]
    );

    if (existingBill.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Bill not found'
      });
    }

    const body = await readBody(event);
    const { amount, nextDueDate, isActive } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }

    if (nextDueDate !== undefined) {
      updates.push(`next_due_date = $${paramIndex}`);
      values.push(nextDueDate);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    // Always mark as user modified when they update
    updates.push(`user_modified = $${paramIndex}`);
    values.push(true);
    paramIndex++;

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    // Add billId and userId for WHERE clause
    values.push(billId);
    values.push(user.id);

    const result = await pool.query(
      `UPDATE user_bills 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, name, amount, frequency, next_due_date, source, is_active`,
      values
    );

    const bill = result.rows[0];

    serverLogger.api('PUT', `/api/user/bills/${billId}`, 200, Date.now() - startTime, user.id);

    return {
      statusCode: 200,
      message: 'Bill updated successfully',
      bill: {
        id: bill.id,
        name: bill.name,
        amount: parseFloat(bill.amount),
        frequency: bill.frequency,
        nextDueDate: bill.next_due_date,
        source: bill.source,
        isActive: bill.is_active
      }
    };

  } catch (error: any) {
    serverLogger.api('PUT', `/api/user/bills/${getRouterParam(event, 'id')}`, error.statusCode || 500, Date.now() - startTime);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update bill'
    });
  }
});
