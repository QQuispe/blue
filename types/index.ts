/**
 * Type Definitions for Blue Finance
 * Central export file for all TypeScript types
 */

// Database entities
export type {
  User,
  Item,
  Account,
  Transaction,
  Budget,
  NetWorthSnapshot,
  Session,
  QueryResult,
  QueryResultArray,
} from './database'

// Plaid integration types
export type {
  PersonalFinanceCategory,
  PlaidTransaction,
  PlaidAccount,
  TransactionSyncResponse,
  PlaidInstitution,
  SyncData,
  SyncResult,
} from './plaid'

// API request/response types
export type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  SyncAccountsRequest,
  SyncAccountsResponse,
  SyncTransactionsRequest,
  SyncTransactionsResponse,
  BalanceResponse,
  NetWorthResponse,
  TransactionsResponse,
  SpendingByCategoryResponse,
  BudgetsResponse,
  DisconnectItemResponse,
  UserItemsResponse,
} from './api'
