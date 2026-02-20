import { defineEventHandler, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth';
import { serverLogger } from '~/server/utils/logger';
import { getFilteredTotalSpend } from '~/server/db/queries/transactions';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  try {
    const user = await requireAuth(event);

    const filters = {
      search: query.search as string | undefined,
      accountId: query.accountId ? parseInt(query.accountId as string) : undefined,
      dateFrom: getDateFromPreset(query.datePreset as string),
      excludePending: true
    };

    const totalSpend = await getFilteredTotalSpend(user.id, filters);

    return { totalSpend };
  } catch (error) {
    serverLogger.error('Failed to fetch transaction summary');
    throw error;
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
