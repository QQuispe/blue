import { defineEventHandler, createError, readBody } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { serverLogger } from '~/server/utils/logger';
import { pool } from '~/server/db/index';

export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);
    
    const { name, amount, frequency, nextDueDate, source } = body;
    
    if (!name || !amount || !nextDueDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name, amount, nextDueDate'
      });
    }

    const result = await pool.query(
      `INSERT INTO user_bills 
        (user_id, name, amount, frequency, next_due_date, source, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, amount, frequency, next_due_date, source, is_active`,
      [user.id, name, amount, frequency || 'monthly', nextDueDate, source || 'manual']
    );

    const bill = result.rows[0];

    serverLogger.api('POST', '/api/user/bills', 201, Date.now() - startTime, user.id);

    return {
      statusCode: 201,
      message: 'Bill added successfully',
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
    serverLogger.api('POST', '/api/user/bills', error.statusCode || 500, Date.now() - startTime);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to add bill'
    });
  }
});
