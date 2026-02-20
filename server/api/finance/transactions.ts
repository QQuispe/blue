import { defineEventHandler, createError, getQuery, getRequestURL, getMethod } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { serverLogger } from '~/server/utils/logger';
import { 
  getFilteredTransactions,
  getFilteredTransactionCount
} from '~/server/db/queries/transactions';
import type { Transaction } from '~/types/database';
import { getPrimaryCategoryName } from '~/server/utils/categoryMap';

interface TransactionsResponse {
  statusCode: number;
  transactions: Transaction[];
  count: number;
  accountId: number | null;
}

export default defineEventHandler(async (event): Promise<TransactionsResponse> => {
  const startTime = Date.now();
  const url = getRequestURL(event);
  const method = getMethod(event);
  const query = getQuery(event);

  try {
    const user = await requireAuth(event);

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 25;
    const offset = (page - 1) * limit;

    const filters = {
      search: query.search as string | undefined,
      accountId: query.accountId ? parseInt(query.accountId as string) : undefined,
      dateFrom: getDateFromPreset(query.datePreset as string),
      excludePending: true
    };

    const sortParts = (query.sort as string || 'date-desc').split('-');
    const sortField = sortParts[0] as 'date' | 'amount' | 'name';
    const sortDirection = sortParts[1] === 'asc' ? 'asc' as const : 'desc' as const;
    const sort = { field: sortField, direction: sortDirection };

    const [transactions, count] = await Promise.all([
      getFilteredTransactions(user.id, filters, sort, limit, offset),
      getFilteredTransactionCount(user.id, filters)
    ]);

    serverLogger.api(method, url.pathname, 200, Date.now() - startTime, user.id);

    return {
      statusCode: 200,
      transactions: transactions.map(t => ({
        ...t,
        categoryPrimary: getPrimaryCategoryName(t.category)
      })),
      count,
      accountId: null
    };
  } catch (error: any) {
    serverLogger.api(method, url.pathname, error.statusCode || 500, Date.now() - startTime);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch transactions'
    });
  }
});

function getDateFromPreset(preset: string | undefined): string | undefined {
  if (!preset) return undefined;
  
  const today = new Date();
  let days = 0;
  
  switch (preset) {
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    case '90d': days = 90; break;
    case 'mtd': 
      today.setDate(1);
      return today.toISOString().split('T')[0];
    case 'lm':
      today.setMonth(today.getMonth() - 1);
      today.setDate(1);
      return today.toISOString().split('T')[0];
    case 'ytd':
      today.setMonth(0);
      today.setDate(1);
      return today.toISOString().split('T')[0];
    default: days = 30;
  }
  
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
