import { defineEventHandler, createError, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { pool } from '../../db/index';
import { serverLogger } from '~/server/utils/logger';

interface CashFlowMonth {
  month: string;
  year: number;
  income: number;
  expenses: number;
}

interface CashFlowResponse {
  months: string[];
  income: number[];
  expenses: number[];
  totals: {
    income: number;
    expenses: number;
    saved: number;
    net: number;
  };
}

interface RowData {
  month: string;
  year: number;
  month_num: number;
  income: string;
  expenses: string;
}

export default defineEventHandler(async (event): Promise<CashFlowResponse> => {
  const startTime = Date.now();
  
  try {
    const user = await requireAuth(event);

    const result = await pool.query(
      `SELECT 
        TO_CHAR(t.date, 'Mon YYYY') as month,
        EXTRACT(YEAR FROM t.date)::int as year,
        EXTRACT(MONTH FROM t.date)::int as month_num,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::numeric as income,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0)::numeric as expenses
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND NOT t.pending
       GROUP BY TO_CHAR(t.date, 'Mon YYYY'), EXTRACT(YEAR FROM t.date)::int, EXTRACT(MONTH FROM t.date)::int
       ORDER BY year DESC, month_num DESC
       LIMIT 12`,
      [user.id]
    );

    const data: CashFlowMonth[] = result.rows.map((row: RowData) => ({
      month: row.month,
      year: row.year,
      month_num: row.month_num,
      income: parseFloat(row.income) || 0,
      expenses: parseFloat(row.expenses) || 0
    }));

    const reversed = data.reverse();

    const totals = {
      income: reversed.reduce((sum, m) => sum + m.income, 0),
      expenses: reversed.reduce((sum, m) => sum + m.expenses, 0),
      saved: 0,
      net: 0
    };
    totals.saved = totals.income - totals.expenses;
    totals.net = totals.income - totals.expenses;

    serverLogger.api('GET', '/api/user/cash-flow', 200, Date.now() - startTime, user.id);

    return {
      months: reversed.map(m => m.month),
      income: reversed.map(m => m.income),
      expenses: reversed.map(m => m.expenses),
      totals
    };

  } catch (error: any) {
    serverLogger.api('GET', '/api/user/cash-flow', error.statusCode || 500, Date.now() - startTime);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch cash flow data'
    });
  }
});
