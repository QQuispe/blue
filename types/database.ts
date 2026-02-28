/**
 * Database Entity Types
 * Core types for all database tables
 */

// User entity from database
export interface User {
  id: number
  username: string
  email?: string
  password_hash?: string
  is_active: boolean
  is_admin: boolean
  created_at: Date
  updated_at: Date
}

// Plaid Item (bank connection)
export interface Item {
  id: number
  user_id: number
  plaid_item_id: string
  plaid_access_token: string // Encrypted
  plaid_institution_id?: string
  institution_name: string
  status: 'active' | 'error' | 'disconnected'
  transactions_cursor?: string
  last_synced_at?: Date
  created_at: Date
  updated_at: Date
  error?: any
}

// Account entity
export interface Account {
  id: number
  item_id: number
  plaid_account_id: string
  name: string
  mask?: string
  official_name?: string
  current_balance: number
  available_balance?: number
  iso_currency_code?: string
  unofficial_currency_code?: string
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other'
  subtype?: string
  created_at: Date
  updated_at: Date
  institution_name?: string
}

// Transaction entity
export interface Transaction {
  id: number
  account_id: number
  plaid_transaction_id: string
  plaid_category_id?: string
  category?: string
  type?: string
  name: string
  amount: number
  iso_currency_code?: string
  unofficial_currency_code?: string
  date: string // ISO date string
  pending: boolean
  account_owner?: string
  account_name?: string
  logo_url?: string
  created_at: Date
  updated_at: Date
}

// Budget entity
export interface Budget {
  id: number
  user_id: number
  category: string
  category_key?: string // Derived key for matching with Plaid categories
  amount: number
  month: string // Format: 'YYYY-MM'
  is_active: boolean
  is_favorited: boolean
  created_at: Date
  updated_at: Date
}

// Budget with spending data (for API responses)
export interface BudgetWithSpending {
  id: number
  user_id: number
  category: string
  category_key?: string
  budget_amount: number
  spent_amount: number
  remaining_amount: number
  percentage_used: number
  month: string
  is_favorited: boolean
  created_at: Date
}

// Budget history item (for past months)
export interface BudgetHistoryItem {
  id: number
  category: string
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  percentageUsed: number
  month: string
}

// Net Worth Snapshot
export interface NetWorthSnapshot {
  id: number
  user_id: number
  snapshot_date: string // First day of month
  total_assets: number
  total_liabilities: number
  net_worth: number
  account_count: number
  is_synthetic: boolean
  created_at: Date
}

// Session for authentication
export interface Session {
  id: number
  user_id: number
  token: string
  expires_at: Date
  created_at: Date
}

// Helper type for database query results
export type QueryResult<T> = T | null
export type QueryResultArray<T> = T[]

// User settings
export interface UserSettings {
  id: number
  user_id: number
  currency: string
  locale: string
  timezone: string
  theme: string
  notifications_enabled: boolean
  budget_alerts_enabled: boolean
  created_at: Date
  updated_at: Date
}
