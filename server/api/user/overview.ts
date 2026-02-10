import { defineEventHandler, createError, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { pool } from '../../db/index.js';
import { serverLogger } from '~/server/utils/logger.js';
import { getUserCurrency } from '~/server/db/queries/settings';

interface OverviewMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

interface OverviewResponse {
  totalBalance: OverviewMetric;
  monthlyIncome: OverviewMetric;
  monthlyExpenses: OverviewMetric;
  totalSavings: OverviewMetric;
  currency: string;
  currentMonth: string;
  previousMonth: string;
}

interface CurrencySettings {
  currency: string;
  symbol: string;
}

async function getCurrencyFromSettings(userId: number): Promise<CurrencySettings> {
  const currency = await getUserCurrency(userId);
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
    INR: '₹',
    MXN: '$',
    BRL: 'R$'
  };
  return {
    currency,
    symbol: symbols[currency] || currency
  };
}

function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default defineEventHandler(async (event): Promise<OverviewResponse> => {
  const startTime = Date.now();
  
  try {
    const user = await requireAuth(event);
    const currencySettings = await getCurrencyFromSettings(user.id);
    
    // Get current and previous month dates
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const previousMonthStr = `${previousYear}-${String(previousMonth + 1).padStart(2, '0')}`;
    
    // Get date ranges for calendar months
    const getMonthDateRange = (year: number, month: number) => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    };
    
    const currentRange = getMonthDateRange(currentYear, currentMonth);
    const previousRange = getMonthDateRange(previousYear, previousMonth);
    
    // Query 1: Total Balance (all accounts)
    const balanceQuery = await pool.query(
      `SELECT 
         COALESCE(SUM(a.current_balance), 0) as current,
         (SELECT COALESCE(SUM(a2.current_balance), 0)
          FROM accounts a2
          JOIN items i2 ON a2.item_id = i2.id
          WHERE i2.user_id = $1
          AND a2.updated_at < $2) as previous
       FROM accounts a
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND i.status = 'active'`,
      [user.id, currentRange.startDate]
    );
    
    const totalBalanceCurrent = parseFloat(balanceQuery.rows[0]?.current) || 0;
    const totalBalancePrevious = parseFloat(balanceQuery.rows[0]?.previous) || totalBalanceCurrent;
    
    // Query 2: Monthly Income and Expenses (current and previous month)
    const cashFlowQuery = await pool.query(
      `SELECT 
         TO_CHAR(t.date, 'YYYY-MM') as month,
         COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::numeric as income,
         COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0)::numeric as expenses
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 
         AND NOT t.pending
         AND t.date >= $2
         AND t.date <= $3
       GROUP BY TO_CHAR(t.date, 'YYYY-MM')
       ORDER BY month DESC`,
      [user.id, previousRange.startDate, currentRange.endDate]
    );
    
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    cashFlowQuery.rows.forEach(row => {
      monthlyData[row.month] = {
        income: parseFloat(row.income) || 0,
        expenses: parseFloat(row.expenses) || 0
      };
    });
    
    const currentIncome = monthlyData[currentMonthStr]?.income || 0;
    const previousIncome = monthlyData[previousMonthStr]?.income || 0;
    const currentExpenses = monthlyData[currentMonthStr]?.expenses || 0;
    const previousExpenses = monthlyData[previousMonthStr]?.expenses || 0;
    
    // Query 3: Savings Accounts (strict: depository + savings)
    const savingsQuery = await pool.query(
      `SELECT 
         COALESCE(SUM(a.current_balance), 0) as current,
         (SELECT COALESCE(SUM(a2.current_balance), 0)
          FROM accounts a2
          JOIN items i2 ON a2.item_id = i2.id
          WHERE i2.user_id = $1
          AND a2.type = 'depository' 
          AND a2.subtype = 'savings'
          AND a2.updated_at < $2) as previous
       FROM accounts a
       JOIN items i ON a.item_id = i.id
       WHERE i.user_id = $1 AND i.status = 'active'
       AND a.type = 'depository' 
       AND a.subtype = 'savings'`,
      [user.id, currentRange.startDate]
    );
    
    const savingsCurrent = parseFloat(savingsQuery.rows[0]?.current) || 0;
    const savingsPrevious = parseFloat(savingsQuery.rows[0]?.previous) || savingsCurrent;
    
    // Calculate metrics helper
    const calculateMetric = (current: number, previous: number): OverviewMetric => {
      const change = current - previous;
      const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
      return {
        current,
        previous,
        change,
        changePercent
      };
    };
    
    const result: OverviewResponse = {
      totalBalance: calculateMetric(totalBalanceCurrent, totalBalancePrevious),
      monthlyIncome: calculateMetric(currentIncome, previousIncome),
      monthlyExpenses: calculateMetric(currentExpenses, previousExpenses),
      totalSavings: calculateMetric(savingsCurrent, savingsPrevious),
      currency: currencySettings.currency,
      currentMonth: currentMonthStr,
      previousMonth: previousMonthStr
    };
    
    serverLogger.api('GET', '/api/user/overview', 200, Date.now() - startTime, user.id);
    
    return result;
    
  } catch (error: any) {
    serverLogger.api('GET', '/api/user/overview', error.statusCode || 500, Date.now() - startTime);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch overview data'
    });
  }
});
