# Local Docker Deploy — AmbientTV

## Quick Start

```bash
# 1. Clone repo
git clone https://github.com/ShumTH11/AmbientTV.git
cd AmbientTV

# 2. Create .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your keys

# 3. Start everything
docker compose up -d

# 4. Check status
docker compose ps
curl http://localhost:3000/api/health

# 5. View logs
docker compose logs -f ambienttv

# 6. Stop
docker compose down
```

## What's inside

| Container | Purpose | Port |
|-----------|---------|------|
| `ambienttv` | Backend + Web app | `3000` |
| `ambienttv-redis` | Rate limiting (optional) | `6379` |

## Data persistence

- SQLite database: `./backend/data/users.db`
- Backups: `./backend/backups/`
- Web files: served from `./web/` (host mount)

## Health check

```bash
# Auto-healthcheck every 30s inside container
docker compose exec ambienttv wget -qO- http://localhost:3000/api/health
```

## Rebuild after code changes

```bash
docker compose down
docker compose up -d --build
```
