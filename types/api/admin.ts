import type { ApiSuccess, ApiError } from './common'

export interface AdminStats {
  totalUsers: number
  totalBanks: number
  totalTransactions: number
  totalBills: number
}

export interface AdminStatsResponse extends ApiSuccess<AdminStats> {}
export type AdminError = ApiError
