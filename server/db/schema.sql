-- Complete Database Schema for Blue Finance App
-- Run this to set up a fresh database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plaid Items (bank connections)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plaid_item_id VARCHAR(255) NOT NULL,
    plaid_access_token TEXT NOT NULL,
    plaid_institution_id VARCHAR(255),
    institution_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    error TEXT,
    transactions_cursor TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP
);

-- Plaid Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    plaid_account_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    mask VARCHAR(10),
    official_name VARCHAR(255),
    type VARCHAR(50),
    subtype VARCHAR(50),
    current_balance DECIMAL(15,2),
    available_balance DECIMAL(15,2),
    iso_currency_code VARCHAR(10),
    unofficial_currency_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plaid_transaction_id VARCHAR(255) UNIQUE,
    plaid_category_id VARCHAR(255),
    category VARCHAR(255),
    type VARCHAR(50),
    name VARCHAR(255),
    amount DECIMAL(15,2),
    iso_currency_code VARCHAR(10),
    unofficial_currency_code VARCHAR(10),
    date DATE,
    pending BOOLEAN DEFAULT FALSE,
    account_owner VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logo_url TEXT
);

-- Budgets table (complete with all columns)
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    amount DECIMAL(28,10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_favorited BOOLEAN DEFAULT FALSE,
    month CHAR(7) DEFAULT '' NOT NULL,
    category_key VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category_month UNIQUE (user_id, category, month)
);

-- Bills table
CREATE TABLE IF NOT EXISTS user_bills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
    next_due_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    plaid_account_id VARCHAR(255),
    plaid_liability_type VARCHAR(50),
    detected_pattern_id INTEGER,
    user_modified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detected bill patterns table
CREATE TABLE IF NOT EXISTS detected_bill_patterns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    merchant_name VARCHAR(255),
    category VARCHAR(255),
    confidence DECIMAL(3,2) NOT NULL,
    last_detected DATE NOT NULL,
    sample_transactions JSONB,
    is_ignored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) DEFAULT 'USD',
    locale VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    theme VARCHAR(10) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    budget_alerts_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Net worth snapshots table
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_assets NUMERIC(28,10) NOT NULL,
    total_liabilities NUMERIC(28,10) NOT NULL,
    net_worth NUMERIC(28,10) NOT NULL,
    account_count INTEGER NOT NULL,
    is_synthetic BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, snapshot_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_item_id ON accounts(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_category_key ON budgets(category_key);
CREATE INDEX IF NOT EXISTS idx_user_bills_user_id ON user_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_user_id ON detected_bill_patterns(user_id);

-- Create unique constraint for budgets (one per category per month)
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_month 
ON budgets(user_id, category, month) 
WHERE month IS NOT NULL;

-- Note: Using a unique constraint instead of partial index for ON CONFLICT support
-- ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_month_unique UNIQUE (user_id, category, month);

-- Create index for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create index for net_worth_snapshots
CREATE INDEX IF NOT EXISTS idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date);

-- ============================================================================
-- PERFORMANCE INDEXES (Phase 1 Optimization)
-- These indexes improve query performance for common operations
-- ============================================================================

-- For transaction search performance (ILIKE queries on transaction names)
CREATE INDEX IF NOT EXISTS idx_transactions_name ON transactions(name);

-- For bill sorting by due date
CREATE INDEX IF NOT EXISTS idx_user_bills_next_due_date ON user_bills(user_id, next_due_date);

-- For account balance calculations with date filtering
CREATE INDEX IF NOT EXISTS idx_accounts_updated_at ON accounts(item_id, updated_at);

-- For Plaid ID lookups (webhook handling, transaction sync)
CREATE INDEX IF NOT EXISTS idx_items_plaid_item_id ON items(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_items_plaid_access_token ON items(plaid_access_token);

-- For email-based authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- For composite transaction queries (account + date sorting)
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC, created_at DESC);

-- For user + status filtering on items
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);

-- For active bills query with sorting
CREATE INDEX IF NOT EXISTS idx_user_bills_user_active_date ON user_bills(user_id, is_active, next_due_date);

-- For pending transaction filtering (partial index for boolean with low cardinality)
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(pending) WHERE pending = true;
