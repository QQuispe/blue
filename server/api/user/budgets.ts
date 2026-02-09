import { defineEventHandler, readBody, createError, getQuery } from 'h3';
import { requireAuth } from '~/server/utils/auth.ts';
import { 
  createBudget, 
  getBudgetsByUserId, 
  getBudgetsWithSpending,
  updateBudget,
  deleteBudget,
  getBudgetById,
  getFavoritedCount,
  toggleFavorite,
  budgetExists
} from '~/server/db/queries/budgets.ts';

interface BudgetBody {
  category?: string;
  amount?: number;
  id?: number;
  isFavorited?: boolean;
}

interface BudgetResponse {
  statusCode: number;
  message?: string;
  budgets?: Array<{
    id: number;
    category: string;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
    isFavorited?: boolean;
  }>;
  budget?: any;
  months?: string[];
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function getMonthRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0)
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

export default defineEventHandler(async (event): Promise<BudgetResponse> => {
  try {
    const user = await requireAuth(event);
    const method = event.node.req.method;
    const query = getQuery(event)
    const monthParam = query.month as string | undefined
    const targetMonth = monthParam || getCurrentMonth()
    
    if (method === 'GET') {
      const { startDate, endDate } = getMonthRange(targetMonth)
      const budgets = await getBudgetsWithSpending(user.id, startDate, endDate, targetMonth)
      
      return {
        statusCode: 200,
        budgets: budgets.map(b => ({
          id: b.id,
          category: b.category,
          budgetAmount: Number(b.budget_amount),
          spentAmount: Number(b.spent_amount),
          remainingAmount: Number(b.remaining_amount),
          percentageUsed: Number(b.percentage_used),
          isFavorited: b.is_favorited || false,
          month: b.month || targetMonth
        }))
      };
    }
    
    if (method === 'POST') {
      const body: BudgetBody = await readBody(event);
      const { category, amount, isFavorited = false } = body;
      
      if (!category || !amount) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Category and amount are required'
        });
      }

      const existingBudget = await budgetExists(user.id, category, targetMonth);
      
      if (existingBudget) {
        throw createError({
          statusCode: 409,
          statusMessage: `A budget for "${category}" already exists for ${targetMonth}. Please edit the existing budget instead.`
        });
      }
      
      const budget = await createBudget(user.id, category!, amount!, isFavorited, targetMonth);
      
      return {
        statusCode: 201,
        message: 'Budget created successfully',
        budget
      };
    }
    
    if (method === 'PUT') {
      const body: BudgetBody = await readBody(event);
      const { id, isFavorited } = body;
      
      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Budget ID is required'
        });
      }

      if (isFavorited !== undefined) {
        if (isFavorited) {
          const currentFavoritedCount = await getFavoritedCount(user.id, targetMonth);
          if (currentFavoritedCount >= 2) {
            throw createError({
              statusCode: 400,
              statusMessage: 'You can only favorite up to 2 budgets. Please unfavorite another budget first.'
            });
          }
        }

        const budget = await toggleFavorite(id, isFavorited);
        if (!budget) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Budget not found'
          });
        }
        
        return {
          statusCode: 200,
          message: isFavorited ? 'Budget favorited' : 'Budget unfavorited',
          budget
        };
      }
      
      const budget = await updateBudget(id!, body);
      
      if (!budget) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Budget not found'
        });
      }
      
      return {
        statusCode: 200,
        message: 'Budget updated successfully',
        budget
      };
    }
    
    if (method === 'DELETE') {
      const body: BudgetBody = await readBody(event);
      const { id } = body;
      
      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Budget ID is required'
        });
      }
      
      const budget = await deleteBudget(id!);
      
      if (!budget) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Budget not found'
        });
      }
      
      return {
        statusCode: 200,
        message: 'Budget deleted successfully'
      };
    }
    
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    });
    
  } catch (error: any) {
    console.error('Budget API error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process budget request'
    });
  }
});
