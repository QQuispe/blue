import { defineEventHandler, readBody, createError } from 'h3';
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
}

// Get date range for last 30 days
function getLast30DaysRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0]
  };
}

export default defineEventHandler(async (event): Promise<BudgetResponse> => {
  try {
    const user = await requireAuth(event);
    const method = event.node.req.method;
    
    if (method === 'GET') {
      const { startDate, endDate } = getLast30DaysRange();
      const budgets = await getBudgetsWithSpending(user.id, startDate, endDate);
      
      return {
        statusCode: 200,
        budgets: budgets.map(b => ({
          id: b.id,
          category: b.category,
          budgetAmount: Number(b.budget_amount),
          spentAmount: Number(b.spent_amount),
          remainingAmount: Number(b.remaining_amount),
          percentageUsed: Number(b.percentage_used),
          isFavorited: b.is_favorited || false
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

      const existingBudget = await budgetExists(user.id, category);
      
      if (existingBudget) {
        throw createError({
          statusCode: 409,
          statusMessage: `A budget for "${category}" already exists. Please edit the existing budget instead.`
        });
      }
      
      const budget = await createBudget(user.id, category!, amount!, isFavorited);
      
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
          const currentFavoritedCount = await getFavoritedCount(user.id);
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
