import type { ApiSuccess, ApiError, PaginationMeta } from './common'

// Accounts
export interface Account {
  id: number
  item_id: number
  plaid_account_id: string
  name: string
  type: string
  subtype: string
  mask: string
  balance: number
  currency: string
  sync_status: string
  last_sync: string | null
}

// Transactions
export interface Transaction {
  id: number
  account_id: number
  plaid_transaction_id: string
  amount: number
  currency: string
  date: string
  name: string
  merchant_name: string | null
  category: string[] | null
  pending: boolean
  payment_channel: string
  is_recurring: boolean
}

export interface TransactionFilters {
  accountId?: number
  startDate?: string
  endDate?: string
  category?: string
  search?: string
  minAmount?: number
  maxAmount?: number
}

// Budgets
export interface Budget {
  id: number
  user_id: number
  category: string
  limit: number
  spent: number
  period: string
  created_at: string
}

export interface BudgetWithProgress extends Budget {
  percentage: number
  remaining: number
}

// Bills
export interface BillSuggestion {
  id: string
  name: string
  amount: number
  frequency: string
  confidence: number
  next_due: string
}

export interface UserBill {
  id: number
  user_id: number
  name: string
  amount: number
  frequency: string
  next_due: string
  is_active: boolean
}

// Cash Flow
export interface CashFlowData {
  labels: string[]
  income: number[]
  expenses: number[]
  net: number[]
}

// Net Worth
export interface NetWorthData {
  labels: string[]
  assets: number[]
  liabilities: number[]
  netWorth: number[]
}

// Overview
export interface BalanceData {
  total_balance: number
  currency: string
  accounts: Account[]
}

export interface OverviewData {
  balance: BalanceData
  recentTransactions: Transaction[]
  monthlySpending: { category: string; amount: number }[]
  upcomingBills: UserBill[]
}

// Plaid
export interface PlaidLinkToken {
  link_token: string
}

export interface PlaidExchangeResponseData {
  success: boolean
  item_id: string
  accounts: Account[]
}

// API Response Types
export interface OverviewResponse extends ApiSuccess<OverviewData> {}
export interface BalanceResponse extends ApiSuccess<BalanceData> {}
export interface NetWorthResponse extends ApiSuccess<NetWorthData> {}
export interface CashFlowResponse extends ApiSuccess<CashFlowData> {}
export interface TransactionsResponse extends ApiSuccess<{
  transactions: Transaction[]
  meta: PaginationMeta
}> {}
export interface TransactionFiltersResponse extends ApiSuccess<{ filters: TransactionFilters }> {}
export interface BudgetsResponse extends ApiSuccess<{ budgets: BudgetWithProgress[] }> {}
export interface BillsResponse extends ApiSuccess<{
  bills: UserBill[]
  suggestions: BillSuggestion[]
}> {}
export interface PlaidLinkResponse extends ApiSuccess<PlaidLinkToken> {}
export interface PlaidExchangeResponse extends ApiSuccess<PlaidExchangeResponseData> {}

export type FinanceError = ApiError

// ============================================
// Plaid Integration Types
// ============================================

// Personal Finance Category from Plaid
export interface PersonalFinanceCategory {
  primary: string
  detailed: string
  confidence_level?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW'
}

// Plaid Transaction (raw from Plaid API)
export interface PlaidTransaction {
  transaction_id: string
  account_id: string
  amount: number
  iso_currency_code?: string
  unofficial_currency_code?: string
  date: string
  name: string
  merchant_name?: string
  logo_url?: string
  website?: string
  personal_finance_category?: PersonalFinanceCategory
  payment_channel: 'online' | 'in store' | 'other'
  pending: boolean
  pending_transaction_id?: string
  account_owner?: string
  category?: string[]
  category_id?: string
  check_number?: string
  location?: {
    address?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
    lat?: number
    lon?: number
  }
  payment_meta?: {
    reference_number?: string
    ppd_id?: string
    payee?: string
    by_order_of?: string
    payer?: string
    payment_method?: string
    payment_processor?: string
    reason?: string
  }
}

// Plaid Account (raw from Plaid API)
export interface PlaidAccount {
  account_id: string
  balances: {
    available?: number
    current: number
    iso_currency_code?: string
    unofficial_currency_code?: string
    limit?: number
  }
  mask?: string
  name: string
  official_name?: string
  subtype?: string
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other'
}

// Transaction Sync Response from Plaid
export interface TransactionSyncResponse {
  added: PlaidTransaction[]
  modified: PlaidTransaction[]
  removed: { transaction_id: string }[]
  next_cursor: string | null
  has_more: boolean
}

// Institution from Plaid
export interface PlaidInstitution {
  institution_id: string
  name: string
  products: string[]
  country_codes: string[]
  url?: string
  primary_color?: string
  logo?: string
}

// Sync data structure for internal use
export interface SyncData {
  added: PlaidTransaction[]
  modified: PlaidTransaction[]
  removed: { transaction_id: string }[]
  nextCursor: string | null
}

// Sync result from database operations
export interface SyncResult {
  added: number
  modified: number
  removed: number
  newCursor?: string
}
