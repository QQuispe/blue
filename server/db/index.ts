import pg from 'pg'
const { Pool } = pg
import { serverLogger } from '~/server/utils/logger'

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
})

// Test connection
pool
  .connect()
  .then(client => {
    serverLogger.success('Database connection successful')
    client.release()
  })
  .catch(err => serverLogger.error(`Database connection error: ${err.stack}`))

export { pool }
