/**
 * Plaid Integration Types
 * Types for working with Plaid API data
 */

// Personal Finance Category from Plaid
export interface PersonalFinanceCategory {
  primary: string;
  detailed: string;
  confidence_level?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
}

// Plaid Transaction (raw from Plaid API)
export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code?: string;
  unofficial_currency_code?: string;
  date: string;
  name: string;
  merchant_name?: string;
  logo_url?: string;
  website?: string;
  personal_finance_category?: PersonalFinanceCategory;
  payment_channel: 'online' | 'in store' | 'other';
  pending: boolean;
  pending_transaction_id?: string;
  account_owner?: string;
  // Additional fields Plaid may return
  category?: string[];
  category_id?: string;
  check_number?: string;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
  payment_meta?: {
    reference_number?: string;
    ppd_id?: string;
    payee?: string;
    by_order_of?: string;
    payer?: string;
    payment_method?: string;
    payment_processor?: string;
    reason?: string;
  };
}

// Plaid Account (raw from Plaid API)
export interface PlaidAccount {
  account_id: string;
  balances: {
    available?: number;
    current: number;
    iso_currency_code?: string;
    unofficial_currency_code?: string;
    limit?: number;
  };
  mask?: string;
  name: string;
  official_name?: string;
  subtype?: string;
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other';
}

// Transaction Sync Response from Plaid
export interface TransactionSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  next_cursor: string | null;
  has_more: boolean;
}

// Institution from Plaid
export interface PlaidInstitution {
  institution_id: string;
  name: string;
  products: string[];
  country_codes: string[];
  url?: string;
  primary_color?: string;
  logo?: string;
}

// Sync data structure for internal use
export interface SyncData {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  nextCursor: string | null;
}

// Sync result from database operations
export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  newCursor?: string;
}
