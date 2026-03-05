# Blue

Personal finance and health tracking application built with Nuxt 3, Vue 3, and PostgreSQL.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your Plaid credentials and secrets
docker-compose up
```

Open http://localhost:3000

Data persists in a Docker volume across restarts.

## Production Deploy

**Critical:** Always clear the build volume when deploying to prevent stale asset issues. JS/CSS files get new hashes on each build; old volume causes 404 errors.

```bash
docker-compose -f docker-compose.prod.yml down
docker volume rm blue_app_output
docker-compose -f docker-compose.prod.yml build --no-cache app
docker-compose -f docker-compose.prod.yml up -d
```

**Required environment variables:**

- `NODE_ENV=production`
- `DEV_MODE=false`
- `HTTPS_ENABLED=false` (set to `true` with TLS)
- `DATABASE_URI`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `ENCRYPTION_KEY`, `SESSION_SECRET`

Access at http://your-server-ip (port 80)

**Port mapping:**

- Development: port 3000
- Production: port 80 (via Nginx)

## Development

```bash
npm install
npm run dev
```

## Docker Compose Files

- `docker-compose.yml` - Development with hot reloading
- `docker-compose.prod.yml` - Production with Nginx reverse proxy
- `Dockerfile.prod` - Optimized production build
- `nginx.conf` - Nginx configuration for static assets

## Commands

```bash
# Code quality
docker-compose exec app npm run lint
docker-compose exec app npm run lint:fix
docker-compose exec app npm run format
docker-compose exec app npm run check

# Database
docker-compose exec db psql -U postgres -d mydatabase
```

## Architecture

- **Frontend:** Nuxt 3 + Vue 3 with SSR, Composition API
- **Styling:** CSS variables for light/dark themes
- **Database:** PostgreSQL 15
- **API:** Nitro server routes
- **Security:** Session-based auth, encrypted tokens
- **Features:** Finance tracking via Plaid, nutrition logging with custom foods/recipes (single source of truth), meal planning, responsive mobile UI with theme support

## Mobile

Bottom navigation (Finance, Health, Settings) with slide-up submenus. Theme toggle and logout available in Settings page.

## Learn More

- [Nuxt docs](https://nuxt.com/docs)
- [Plaid docs](https://plaid.com/docs)
