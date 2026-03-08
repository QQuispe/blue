export interface PlaidItem {
  id: number
  user_id: number
  plaid_item_id: string
  plaid_access_token: string
  institution_id: string | null
  institution_name: string | null
  status: string
  error: string | null
  last_sync: Date | null
  created_at: Date
  updated_at: Date
}

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
  last_sync: Date | null
  created_at: Date
  updated_at: Date
}

export interface Transaction {
  id: number
  account_id: number
  plaid_transaction_id: string
  amount: number
  currency: string
  date: Date
  name: string
  merchant_name: string | null
  category: string[] | null
  pending: boolean
  payment_channel: string
  is_recurring: boolean
  created_at: Date
  updated_at: Date
}

export interface Budget {
  id: number
  user_id: number
  category: string
  limit: number
  spent: number
  period: string
  created_at: Date
  updated_at: Date
}

export interface UserBill {
  id: number
  user_id: number
  name: string
  amount: number
  frequency: string
  next_due: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface BillSuggestion {
  id: string
  name: string
  amount: number
  frequency: string
  confidence: number
  next_due: Date
}
