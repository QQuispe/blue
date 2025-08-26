import { Pool } from 'pg'
import { createTables } from '~/database/create'

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
});
console.log("TEST");
// Test connection
pool.connect()
    .then(client => {
        console.log('Database connection successfully');
        client.release();

        // Database table setup
        createTables();
    })
    .catch(err => console.error('Database connection error:', err.stack));

export { pool };