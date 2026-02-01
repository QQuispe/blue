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

- **Frontend:** Nuxt 3 with Vue 3, server-side rendering
- **API:** Nitro server routes in `/server/api/`
- **Database:** PostgreSQL with connection pooling via `pg`
- **Banking:** Plaid API for account connections and transactions
- **Security:** Access tokens encrypted in database

## Features

- [x] Plaid Link integration for bank connections
- [x] Cursor-based transaction synchronization
- [x] Encrypted token storage
- [x] Transaction history with pagination
- [ ] User authentication (Phase 2)
- [ ] Spending analytics (Phase 2)
- [ ] Budget tracking (Phase 3)

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
