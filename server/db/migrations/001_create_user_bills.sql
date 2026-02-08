-- Create user_bills table
CREATE TABLE IF NOT EXISTS user_bills (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
  next_due_date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  is_active BOOLEAN DEFAULT true,
  plaid_account_id VARCHAR(255),
  plaid_liability_type VARCHAR(50),
  detected_pattern_id INTEGER,
  user_modified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_bills_user_id ON user_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bills_next_due_date ON user_bills(next_due_date);
CREATE INDEX IF NOT EXISTS idx_user_bills_is_active ON user_bills(is_active);

-- Create detected_bills_patterns table for tracking detected but not-yet-confirmed bills
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
  is_ignored BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detected_patterns_user_id ON detected_bill_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_confidence ON detected_bill_patterns(confidence);
