import { getTotalBalanceForUser, getAccountsByUserId } from '~/server/db/queries/accounts.js'
import type { Account } from '~/types/database.js'

export interface BalanceSummary {
  totalCurrent: number
  totalAvailable: number
  accountCount: number
  currency: string
}

export interface FormattedAccount {
  id: number
  name: string
  mask?: string
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other'
  item_id: number
  currentBalance: number
  availableBalance: number
  currency: string
}

export interface BalanceData {
  summary: BalanceSummary
  accounts: FormattedAccount[]
}

export async function getBalanceData(userId: number): Promise<BalanceData> {
  // Get total balance
  const balanceSummary = await getTotalBalanceForUser(userId)

  // Get accounts for breakdown
  const accounts = await getAccountsByUserId(userId)

  // Format accounts for frontend
  const formattedAccounts: FormattedAccount[] = accounts.map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    mask: acc.mask,
    type: acc.type as 'depository' | 'credit' | 'loan' | 'investment' | 'other',
    item_id: acc.item_id,
    currentBalance: acc.current_balance,
    availableBalance: acc.available_balance ?? 0,
    currency: acc.iso_currency_code || 'USD',
  }))

  return {
    summary: {
      totalCurrent:
        typeof balanceSummary.total_current === 'string'
          ? parseFloat(balanceSummary.total_current) || 0
          : balanceSummary.total_current || 0,
      totalAvailable:
        typeof balanceSummary.total_available === 'string'
          ? parseFloat(balanceSummary.total_available) || 0
          : balanceSummary.total_available || 0,
      accountCount: formattedAccounts.length,
      currency: formattedAccounts[0]?.currency || 'USD',
    },
    accounts: formattedAccounts,
  }
}
