import { pool } from '~/server/db/index.js'
import { captureNetWorthSnapshot } from './snapshots.js'

export interface NetWorthCurrent {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  accountCount: number
  currency: string
  percentageChange: number
}

export interface NetWorthHistoryItem {
  date: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

export interface NetWorthData {
  current: NetWorthCurrent
  history: NetWorthHistoryItem[]
  timeframe: string
}

function getStartDate(timeframe: string): Date {
  const startDate = new Date()

  switch (timeframe) {
    case '1m':
      startDate.setDate(startDate.getDate() - 30)
      break
    case '3m':
      startDate.setMonth(startDate.getMonth() - 3)
      break
    case '6m':
      startDate.setMonth(startDate.getMonth() - 6)
      break
    case 'ytd':
      startDate.setMonth(0)
      startDate.setDate(1)
      break
    case 'all':
      startDate.setFullYear(startDate.getFullYear() - 10)
      break
    case '12m':
    default:
      startDate.setMonth(startDate.getMonth() - 12)
      break
  }

  return startDate
}

function calculateNetWorthFromAccounts(accounts: any[]): { assets: number; liabilities: number } {
  let totalAssets = 0
  let totalLiabilities = 0

  accounts.forEach((account: any) => {
    const balance = parseFloat(account.current_balance) || 0
    const accountType = account.type

    if (accountType === 'depository' || accountType === 'investment') {
      totalAssets += balance
    } else if (accountType === 'credit' || accountType === 'loan') {
      if (balance > 0) {
        totalLiabilities += balance
      } else {
        totalAssets += Math.abs(balance)
      }
    } else {
      totalAssets += balance
    }
  })

  return { assets: totalAssets, liabilities: totalLiabilities }
}

export async function getNetWorthData(
  userId: number,
  timeframe: string = '12m'
): Promise<NetWorthData> {
  // Get all active accounts for the user
  const accountsResult = await pool.query(
    `SELECT 
      a.id,
      a.name,
      a.type,
      a.current_balance
     FROM accounts a
     JOIN items i ON a.item_id = i.id
     WHERE i.user_id = $1 AND i.status = 'active'`,
    [userId]
  )

  const { assets, liabilities } = calculateNetWorthFromAccounts(accountsResult.rows)
  const currentNetWorth = assets - liabilities

  // Get history for the timeframe
  const startDate = getStartDate(timeframe)
  const historyResult = await pool.query(
    `SELECT 
      snapshot_date as date,
      net_worth,
      total_assets,
      total_liabilities
     FROM net_worth_snapshots
     WHERE user_id = $1 
     AND snapshot_date >= $2
     ORDER BY snapshot_date ASC`,
    [userId, startDate.toISOString().split('T')[0]]
  )

  const history = historyResult.rows.map((row: any) => ({
    date: row.date,
    netWorth: parseFloat(row.net_worth),
    totalAssets: parseFloat(row.total_assets),
    totalLiabilities: parseFloat(row.total_liabilities),
  }))

  // Calculate percentage change
  let percentageChange = 0
  if (history.length >= 2) {
    const current = history[history.length - 1].netWorth
    const previous = history[history.length - 2]?.netWorth || current
    if (previous !== 0) {
      percentageChange = ((current - previous) / previous) * 100
    }
  }

  // Capture current snapshot
  await captureNetWorthSnapshot(userId)

  return {
    current: {
      netWorth: currentNetWorth,
      totalAssets: assets,
      totalLiabilities: liabilities,
      accountCount: accountsResult.rows.length,
      currency: 'USD',
      percentageChange: parseFloat(percentageChange.toFixed(2)),
    },
    history,
    timeframe,
  }
}
