import {
  getFilteredTransactions,
  getFilteredTransactionCount,
  type TransactionFilters,
  type TransactionSort,
  getFilteredTotalSpend,
} from '~/server/db/queries/transactions.js'
import { getAccountsByUserId } from '~/server/db/queries/accounts.js'
import type { Transaction } from '~/types/database.js'

export interface TransactionWithCategory extends Transaction {
  categoryPrimary?: string
}

export interface TransactionFiltersData {
  accounts: { id: number; name: string }[]
}

export interface TransactionsData {
  transactions: TransactionWithCategory[]
  count: number
  accountId: number | null
}

export function getDateFromPreset(preset: string | undefined): string | undefined {
  if (!preset) return undefined

  const today = new Date()
  let days = 0

  switch (preset) {
    case '7d':
      days = 7
      break
    case '30d':
      days = 30
      break
    case '90d':
      days = 90
      break
    case 'mtd':
      today.setDate(1)
      return today.toISOString().split('T')[0]
    case 'lm':
      today.setMonth(today.getMonth() - 1)
      today.setDate(1)
      return today.toISOString().split('T')[0]
    case 'ytd':
      today.setMonth(0)
      today.setDate(1)
      return today.toISOString().split('T')[0]
    default:
      days = 30
  }

  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export async function getTransactions(
  userId: number,
  page: number = 1,
  limit: number = 25,
  search?: string,
  accountId?: number,
  datePreset?: string,
  sortField: 'date' | 'amount' | 'name' = 'date',
  sortDirection: 'asc' | 'desc' = 'desc'
): Promise<TransactionsData> {
  const offset = (page - 1) * limit

  const filters: TransactionFilters = {
    search,
    accountId,
    dateFrom: getDateFromPreset(datePreset),
    excludePending: true,
  }

  const sort: TransactionSort = { field: sortField, direction: sortDirection }

  const [transactionsResult, count] = await Promise.all([
    getFilteredTransactions(userId, filters, sort, limit, offset),
    getFilteredTransactionCount(userId, filters),
  ])

  const transactions = transactionsResult as unknown as TransactionWithCategory[]

  return {
    transactions: transactions as TransactionWithCategory[],
    count,
    accountId: null,
  }
}

export async function getTransactionFilters(userId: number): Promise<TransactionFiltersData> {
  const accounts = await getAccountsByUserId(userId)

  return {
    accounts: accounts.map((acc: any) => ({ id: acc.id, name: acc.name })),
  }
}

export async function getTransactionSummary(
  userId: number,
  search?: string,
  accountId?: number,
  datePreset?: string
): Promise<{ totalSpend: number }> {
  const filters: TransactionFilters = {
    search,
    accountId,
    dateFrom: getDateFromPreset(datePreset),
    excludePending: true,
  }

  const totalSpend = await getFilteredTotalSpend(userId, filters)

  return { totalSpend }
}
