# Docker Environment Guide

This project uses separate Docker Compose configurations for development and production.

## Quick Commands

### Development (Local)

```bash
# Start with hot reloading
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down

# Rebuild after dependency changes
docker compose up -d --build
```

### Production

```bash
# Start production build
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Stop
docker compose -f docker-compose.prod.yml down

# Force rebuild (clear all caches)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

## Key Differences

| Feature           | Development             | Production                                                |
| ----------------- | ----------------------- | --------------------------------------------------------- |
| **Command**       | `docker compose up -d`  | `docker compose -f docker-compose.prod.yml up -d --build` |
| **Hot Reload**    | Yes (volume mount)      | No (built image only)                                     |
| **DEV_MODE**      | `true`                  | `false`                                                   |
| **Volume Mounts** | Yes (code changes live) | No (isolated build)                                       |
| **Build Cache**   | Reused                  | Clean build every deploy                                  |
| **Restart**       | No                      | Unless stopped                                            |

## Why Separate Files?

**Development** (`docker-compose.yml`):

- Mounts local directory for live code changes
- Uses `npm run dev` for hot reloading
- Anonymous volume hides `.nuxt` folder to prevent dev/prod conflicts

**Production** (`docker-compose.prod.yml`):

- No volume mounts (prevents dev files from leaking)
- Multi-stage Docker build for smaller image
- Runs compiled output directly with Node.js
- Forces fresh build every deploy

## Troubleshooting

### Hydration errors in production

```bash
# The old fix (no longer needed with separate compose files)
docker compose down
rm -rf .nuxt
docker compose up -d --build
```

With the new setup, production uses `Dockerfile.prod` which creates a clean build without any local file mounts.

### Port already in use

```bash
# Check what's using port 3009
lsof -i :3009

# Kill process or change port in compose file
```

### Database connection issues

```bash
# Check database container
docker compose ps

# View database logs
docker compose logs db

# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

## Environment Variables

Development uses defaults, production requires these to be set:

- `DATABASE_URI`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`
- `ENCRYPTION_KEY`
- `SESSION_SECRET`
- `POSTGRES_PASSWORD`

Create a `.env` file or export them before running production commands.
