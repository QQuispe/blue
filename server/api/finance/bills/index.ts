import { defineEventHandler, createError, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { serverLogger } from '~/server/utils/logger';
import { pool } from '~/server/db/index';

interface Bill {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  daysUntil: number;
  source: string;
  type?: string;
  isUserManaged: boolean;
  isActive: boolean;
}

interface SuggestedBill {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  confidence: number;
  detectedDate: string;
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  
  try {
    const user = await requireAuth(event);
    const query = getQuery(event);
    const includeInactive = query.includeInactive === 'true';

    // Fetch user's bills
    let billsQuery = `
      SELECT 
        id,
        name,
        amount,
        frequency,
        next_due_date,
        source,
        plaid_liability_type as type,
        user_modified,
        is_active
      FROM user_bills
      WHERE user_id = $1
    `;
    
    if (!includeInactive) {
      billsQuery += ' AND is_active = true';
    }
    
    billsQuery += ' ORDER BY next_due_date ASC';

    const billsResult = await pool.query(billsQuery, [user.id]);
    
    const today = new Date();
    
    const bills: Bill[] = billsResult.rows.map(row => {
      const dueDate = new Date(row.next_due_date);
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: row.id,
        name: row.name,
        amount: parseFloat(row.amount),
        frequency: row.frequency,
        nextDueDate: row.next_due_date,
        daysUntil,
        source: row.source,
        type: row.type,
        isUserManaged: row.user_modified || row.source === 'manual',
        isActive: row.is_active
      };
    });

    // Fetch suggested bills (detected patterns not yet added)
    const suggestionsResult = await pool.query(
      `SELECT 
        id,
        name,
        amount,
        frequency,
        confidence,
        last_detected
      FROM detected_bill_patterns
      WHERE user_id = $1 AND is_ignored = false
      ORDER BY confidence DESC, last_detected DESC
      LIMIT 5`,
      [user.id]
    );

    const suggestions: SuggestedBill[] = suggestionsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      amount: parseFloat(row.amount),
      frequency: row.frequency,
      confidence: parseFloat(row.confidence),
      detectedDate: row.last_detected
    }));

    serverLogger.api('GET', '/api/user/bills', 200, Date.now() - startTime, user.id);

    return {
      statusCode: 200,
      bills,
      suggestions,
      totalDue: bills.reduce((sum, bill) => sum + bill.amount, 0)
    };

  } catch (error: any) {
    serverLogger.api('GET', '/api/user/bills', error.statusCode || 500, Date.now() - startTime);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch bills'
    });
  }
});
