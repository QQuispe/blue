import { pool } from "~/server/db/index";

async function createTables() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create items table (with cursor for transaction sync)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plaid_access_token VARCHAR(255) UNIQUE NOT NULL,
                plaid_item_id VARCHAR(255) UNIQUE NOT NULL,
                plaid_institution_id VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                transactions_cursor VARCHAR(255)
            );
        `);

        // Create accounts table
        await pool.query(`
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
        `);

        // Create transactions table
        await pool.query(`
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
        `);

        console.log('Tables created successfully.');
    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        pool.end();
    }
}

createTables();