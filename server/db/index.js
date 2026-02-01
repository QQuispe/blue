import { Pool } from 'pg'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
});

// Test connection and create tables
pool.connect()
    .then(async (client) => {
        console.log('Database connection successful');
        client.release();

        // Database table setup
        try {
            // Use absolute path for dynamic import
            const currentDir = dirname(fileURLToPath(import.meta.url));
            const createTablesPath = join(currentDir, '../../database/create.js');
            const { createTables } = await import(createTablesPath);
            await createTables();
        } catch (err) {
            console.error('Error creating tables:', err);
        }
    })
    .catch(err => console.error('Database connection error:', err.stack));

export { pool };