/**
 * API Request/Response Types
 * Types for all API endpoints
 */

import type { User, Account, Transaction, Budget, NetWorthSnapshot } from './database';

// ============================================
// Auth API Types
// ============================================

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  user?: {
    id: number;
    username: string;
    email?: string;
  };
}

// ============================================
// Plaid API Types
// ============================================

export interface ExchangeTokenRequest {
  publicToken: string;
}

export interface ExchangeTokenResponse {
  status: string;
  itemId: string;
  internalId: number;
  institutionId?: string;
  accountsCreated?: number;
}

export interface SyncAccountsRequest {
  itemId: string;
}

export interface SyncAccountsResponse {
  statusCode: number;
  message: string;
  accounts: {
    id: number;
    name: string;
    type: string;
    current_balance: number;
    available_balance?: number;
  }[];
}

export interface SyncTransactionsRequest {
  itemId: string;
}

export interface SyncTransactionsResponse {
  statusCode: number;
  message: string;
  stats: {
    added: number;
    modified: number;
    removed: number;
    newCursor?: string;
  };
}

// ============================================
// User Data API Types
// ============================================

export interface BalanceResponse {
  statusCode: number;
  summary: {
    totalCurrent: number;
    totalAvailable: number;
    accountCount: number;
    currency: string;
  };
  accounts: {
    id: number;
    name: string;
    mask?: string;
    type: string;
    currentBalance: number;
    availableBalance?: number;
    currency: string;
  }[];
}

export interface NetWorthResponse {
  statusCode: number;
  current: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    accountCount: number;
    currency: string;
    percentageChange: number;
  };
  history: {
    date: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    isSynthetic: boolean;
  }[];
  timeframe: string;
  hasSyntheticData: boolean;
}

export interface TransactionsResponse {
  statusCode: number;
  transactions: (Transaction & { account_name?: string })[];
}

export interface SpendingByCategoryResponse {
  statusCode: number;
  categories: {
    category: string;
    amount: number;
    transactionCount: number;
    percentage: string;
  }[];
  totalSpending: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface BudgetsResponse {
  statusCode: number;
  budgets: {
    id: number;
    category: string;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
    period: string;
  }[];
  period: {
    startDate: string;
    endDate: string;
  };
}

// ============================================
// Items (Bank Connections) API Types
// ============================================

export interface DisconnectItemResponse {
  statusCode: number;
  message: string;
}

export interface UserItemsResponse {
  statusCode: number;
  items: {
    id: number;
    plaid_item_id: string;
    institution_name: string;
    status: string;
    last_synced_at?: string;
    created_at: string;
  }[];
}

// ============================================
// Cash Flow API Types
// ============================================

export interface CashFlowResponse {
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
