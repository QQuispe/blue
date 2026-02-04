import { Pool } from 'pg'

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
});

// Test connection
pool.connect()
    .then(client => {
        console.log('Database connection successful');
        client.release();
    })
    .catch(err => console.error('Database connection error:', err.stack));

export { pool };