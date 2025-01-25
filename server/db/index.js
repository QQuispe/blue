import { Pool } from 'pg'

const dbURI = process.env.DB_URI;

const pool = new Pool({
  connectionString: dbURI,
});

// Test connection
pool.connect()
    .then(client => {
        console.log('Database connection successfully');
        client.release();
    })
    .catch(err => console.error('Database connection error:', err.stack));

export { pool };