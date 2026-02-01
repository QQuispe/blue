import { defineEventHandler, readBody, createError } from 'h3';
import { requireAuth } from '~/server/utils/auth.js';
import { 
  createBudget, 
  getBudgetsByUserId, 
  getBudgetsWithSpending,
  updateBudget,
  deleteBudget 
} from '~/server/db/queries/budgets.js';

// Get date range for current month
function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const method = event.node.req.method;
    
    if (method === 'GET') {
      // Get budgets with spending data for current month
      const { startDate, endDate } = getCurrentMonthRange();
      const budgets = await getBudgetsWithSpending(user.id, startDate, endDate);
      
      return {
        statusCode: 200,
        budgets: budgets.map(b => ({
          id: b.id,
          category: b.category,
          budgetAmount: parseFloat(b.budget_amount),
          spentAmount: parseFloat(b.spent_amount),
          remainingAmount: parseFloat(b.remaining_amount),
          percentageUsed: parseFloat(b.percentage_used),
          period: b.period
        })),
        period: { startDate, endDate }
      };
    }
    
    if (method === 'POST') {
      const body = await readBody(event);
      const { category, amount, period = 'monthly', startDate, endDate } = body;
      
      if (!category || !amount || !startDate) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Category, amount, and startDate are required'
        });
      }
      
      const budget = await createBudget(user.id, category, amount, period, startDate, endDate);
      
      return {
        statusCode: 201,
        message: 'Budget created successfully',
        budget
      };
    }
    
    if (method === 'PUT') {
      const body = await readBody(event);
      const { id, ...updates } = body;
      
      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Budget ID is required'
        });
      }
      
      const budget = await updateBudget(id, updates);
      
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
      const body = await readBody(event);
      const { id } = body;
      
      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Budget ID is required'
        });
      }
      
      const budget = await deleteBudget(id);
      
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
    
  } catch (error) {
    console.error('Budget API error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process budget request'
    });
  }
});
