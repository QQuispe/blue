import { pool } from '../server/db/index.js'
import { fileURLToPath } from 'url'

// Global flag to prevent multiple simultaneous table creation attempts
let isCreatingTables = false

export async function createTables() {
  // Prevent multiple workers from trying to create tables simultaneously
  if (isCreatingTables) {
    console.log('Table creation already in progress, skipping...')
    return
  }

  isCreatingTables = true

  try {
    // Use a transaction with advisory lock to prevent race conditions
    const client = await pool.connect()

    try {
      // Acquire advisory lock (ID 42 is arbitrary)
      await client.query('SELECT pg_advisory_lock(42)')

      // Check if tables already exist
      const tableCheck = await client.query(`
                SELECT EXISTS (
                    SELECT FROM pg_tables 
                    WHERE schemaname = 'public' 
                    AND tablename = 'users'
                );
            `)

      if (tableCheck.rows[0].exists) {
        console.log('Database tables already exist, checking for schema updates...')

        // Check if email column exists in users table
        const emailColumnCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'email'
                    );
                `)

        if (!emailColumnCheck.rows[0].exists) {
          console.log('Adding email column to users table...')
          await client.query(`
                        ALTER TABLE users 
                        ADD COLUMN email VARCHAR(255) UNIQUE,
                        ADD COLUMN password_hash VARCHAR(255),
                        ADD COLUMN is_active BOOLEAN DEFAULT true,
                        ADD COLUMN is_admin BOOLEAN DEFAULT false;
                    `)
          console.log('Schema updated successfully.')
        }

        // Check if budgets table exists
        const budgetsTableCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM pg_tables 
                        WHERE schemaname = 'public' 
                        AND tablename = 'budgets'
                    );
                `)

        if (!budgetsTableCheck.rows[0].exists) {
          console.log('Creating budgets table...')
          await client.query(`
                        CREATE TABLE budgets (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                            category VARCHAR(255) NOT NULL,
                            amount NUMERIC(28,10) NOT NULL,
                            period VARCHAR(50) NOT NULL DEFAULT 'monthly',
                            start_date DATE NOT NULL,
                            end_date DATE,
                            is_active BOOLEAN DEFAULT true,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE(user_id, category, period)
                        );
                    `)
          console.log('Budgets table created successfully.')
        }

        // Check if net_worth_snapshots table exists
        const snapshotsTableCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM pg_tables 
                        WHERE schemaname = 'public' 
                        AND tablename = 'net_worth_snapshots'
                    );
                `)

        if (!snapshotsTableCheck.rows[0].exists) {
          console.log('Creating net_worth_snapshots table...')
          await client.query(`
                        CREATE TABLE net_worth_snapshots (
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
                    `)
          await client.query(`
                        CREATE INDEX idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date);
                    `)
          console.log('Net worth snapshots table created successfully.')
        }

        // Check if logo_url column exists in transactions table
        const logoUrlColumnCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'transactions' 
                        AND column_name = 'logo_url'
                    );
                `)

        if (!logoUrlColumnCheck.rows[0].exists) {
          console.log('Adding logo_url column to transactions table...')
          await client.query(`
                        ALTER TABLE transactions 
                        ADD COLUMN logo_url TEXT;
                    `)
          console.log('Logo URL column added successfully.')
        }

        return
      }

      // Create tables in a single transaction
      await client.query('BEGIN')

      // Create users table (with auth support)
      await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    password_hash VARCHAR(255),
                    is_active BOOLEAN DEFAULT true,
                    is_admin BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `)

      // Create invite codes table (for controlled registration)
      await client.query(`
                CREATE TABLE IF NOT EXISTS invite_codes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(255) UNIQUE NOT NULL,
                    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    is_used BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    used_at TIMESTAMP
                );
            `)

      // Create items table (with cursor for transaction sync)
      await client.query(`
                CREATE TABLE IF NOT EXISTS items (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    plaid_access_token TEXT UNIQUE NOT NULL,
                    plaid_item_id VARCHAR(255) UNIQUE NOT NULL,
                    plaid_institution_id VARCHAR(255) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    transactions_cursor VARCHAR(255)
                );
            `)

      // Create accounts table
      await client.query(`
                CREATE TABLE IF NOT EXISTS accounts (
                    id SERIAL PRIMARY KEY,
                    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
                    plaid_account_id VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    mask VARCHAR(50) NOT NULL,
                    official_name VARCHAR(255),
                    current_balance NUMERIC(28,10),
                    available_balance NUMERIC(28,10),
                    iso_currency_code VARCHAR(3),
                    unofficial_currency_code VARCHAR(3),
                    type VARCHAR(50) NOT NULL,
                    subtype VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `)

      // Create transactions table
      await client.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
                    plaid_transaction_id VARCHAR(255) UNIQUE NOT NULL,
                    plaid_category_id VARCHAR(255),
                    category VARCHAR(255),
                    type VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    amount NUMERIC(28,10) NOT NULL,
                    iso_currency_code VARCHAR(3),
                    unofficial_currency_code VARCHAR(3),
                    date DATE NOT NULL,
                    pending BOOLEAN NOT NULL,
                    account_owner VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `)

      // Create budgets table
      await client.query(`
                CREATE TABLE IF NOT EXISTS budgets (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    category VARCHAR(255) NOT NULL,
                    amount NUMERIC(28,10) NOT NULL,
                    period VARCHAR(50) NOT NULL DEFAULT 'monthly',
                    start_date DATE NOT NULL,
                    end_date DATE,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, category, period)
                );
            `)

      await client.query('COMMIT')
      console.log('Tables created successfully.')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      // Release advisory lock
      await client.query('SELECT pg_advisory_unlock(42)')
      client.release()
    }
  } catch (err) {
    // If error is about duplicate tables, it's fine - another worker already created them
    if (err.message && err.message.includes('duplicate key value violates unique constraint')) {
      console.log('Tables already exist (created by another worker).')
    } else {
      console.error('Error creating tables:', err)
    }
  } finally {
    isCreatingTables = false
  }
}

// If this file is run directly with `node database/create.js`, run createTables().
if (process.argv[1] && process.argv[1].includes('database/create.js')) {
  createTables()
}
