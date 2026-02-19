# Blue - Personal Finance Dashboard

A Nuxt 3 + Vue 3 application with Plaid integration for personal finance management.

## Quick Start with Docker

The easiest way to get started is using Docker Compose, which will set up both the app and PostgreSQL database.

### Prerequisites
- Docker Desktop installed and running
- Plaid account with API credentials

### Setup

1. **Copy environment template:**
```bash
cp .env.example .env
```

2. **Edit `.env` with your Plaid credentials:**
```
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

3. **Start the application:**
```bash
docker-compose up
```

4. **Open http://localhost:3000** in your browser

The database will automatically create tables on first run. Data persists in a Docker volume.

### Viewing Database

To inspect the database:
```bash
# Connect to PostgreSQL container
docker-compose exec db psql -U postgres -d mydatabase

# Or use any PostgreSQL client on localhost:5432
# User: postgres, Password: mypassword, Database: mydatabase
```

## Development (Without Docker)

If you prefer to run locally without Docker:

```bash
# Install dependencies
npm install

# Set up PostgreSQL locally and update DATABASE_URI in .env

# Run development server
npm run dev
```

## Architecture

- **Frontend:** Nuxt 3 with Vue 3, Composition API, server-side rendering
- **Styling:** Scoped CSS with CSS variables for theming
- **API:** Nitro server routes in `/server/api/` with H3
- **Database:** PostgreSQL 15 with connection pooling via `pg`
- **Banking:** Plaid API for account connections and transactions
- **Security:** 
  - Access tokens encrypted with AES-256-GCM
  - Session-based authentication with HTTP-only cookies
  - Row-level security via user_id foreign keys
- **Performance:** 
  - Database indexes for query optimization (see Performance section)
  - Planned: Client-side caching layer

## Performance

The application includes database optimizations for production use:

- **Indexes:** Strategic indexes on foreign keys, date columns, and search fields
- **Query Optimization:** Parallel query execution where possible
- **Response Times:** Typical API responses complete in 30-100ms
- **Data Volume:** Designed for 50-100 transactions/month per user with 20+ accounts

### Current API Response Times
- `/api/user/balance`: ~35ms
- `/api/user/transactions`: ~45ms  
- `/api/user/overview`: ~95ms (slowest, uses complex aggregations)
- `/api/user/items`: ~10ms

See `server/db/schema.sql` for full index definitions.

## Features

- [x] User authentication (login/register)
- [x] Plaid Link integration for bank connections
- [x] Cursor-based transaction synchronization
- [x] Encrypted token storage (AES-256-GCM)
- [x] Transaction history with filtering and pagination
- [x] Multi-account dashboard with net worth tracking
- [x] Bills management with pattern detection
- [x] Budget tracking with progress bars
- [x] Spending analytics and cash flow visualization
- [x] Account management with sync status
- [x] Responsive design (desktop, tablet, mobile)
- [ ] **Caching layer (Pinia + localStorage) - Future Enhancement**

### Future Enhancements

**Caching Strategy (Planned):**
Currently, all data is fetched fresh on each page load. For better performance at scale:
- **Phase 2:** Implement Pinia + localStorage caching with SWR (Stale-While-Revalidate) pattern
- Cache dashboard data for 5 minutes
- Cache account metadata for 30 minutes
- Background refresh for non-blocking UI updates
- This will provide instant page loads for returning users

## Plaid Environment

The app uses Plaid Sandbox by default. To switch to Development or Production:

1. Update `PLAID_ENV` in `.env` (sandbox/development/production)
2. Ensure your `PLAID_SECRET` matches the environment
3. Restart the application

## Database Schema

- **users** - User accounts (simplified for Phase 1)
- **items** - Plaid connected institutions with encrypted access tokens
- **accounts** - Bank accounts linked to items
- **transactions** - Transaction history with categorization

## Learn More

- [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction)
- [Plaid API documentation](https://plaid.com/docs/)
