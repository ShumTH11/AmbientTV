# AmbientTV — Deployment Guide

## Backend Architecture

```
┌─────────────┐      HTTPS       ┌─────────────────────────────┐      HTTPS      ┌──────────────┐
│  Android TV │  ─────────────►  │  Node.js Backend (Docker)   │  ────────────►  │  Pexels API  │
│             │   httpOnly Cookie │  • Holds all API keys       │                 │  YouTube API │
│  (no keys)  │                  │  • Enforces auth            │                 │  Pixabay API │
└─────────────┘                  │  • Proxies search           │                 │  Coverr API  │
                                 └─────────────────────────────┘                 └──────────────┘
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- (Optional) [Nginx](https://nginx.org/) for reverse proxy with SSL

For Kubernetes deployment (deprecated), see archived docs in `k8s/ARCHIVED.md`.

---

## 1. Configure Secrets

Create `backend/.env`:

```env
APP_SECRET=atv_prod_2026_4f8a9b2c1d3e5f6a7b8c9d0e1f2a3b4c
ADMIN_PASSWORD_HASH=$2b$10$...  # bcrypt hash of your admin password
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
PEXELS_API_KEY=your_key
PIXABAY_API_KEY=your_key
YOUTUBE_API_KEY=your_key
COVERR_API_KEY=your_key
```

**Generate admin password hash:**
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your_admin_password', 10));"
```

**IMPORTANT:** Rotate `APP_SECRET` before production. Do **not** reuse the example token.

---

## 2. Docker Deployment

### 2.1 Quick Start (Development)

```bash
# Build and start
docker-compose up --build -d

# Or use the deploy script
./deploy-docker.sh dev

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

Backend will be available at `http://localhost:3000`

### 2.2 Production Deployment

```bash
# Build production image
docker build -t ambienttv/backend:latest ./backend

# Start with nginx reverse proxy
./deploy-docker.sh prod

# Or manually:
docker-compose -f docker-compose.prod.yml up -d
```

Services in production:
- **Backend**: `http://localhost:3000` (internal)
- **Nginx**: `http://localhost` (external, port 80)
- **Redis**: internal only (port 6379 not exposed)

### 2.3 Docker Compose Files

| File | Environment | Services |
|------|-------------|----------|
| `docker-compose.yml` | Development | backend + redis (redis exposed on 6379) |
| `docker-compose.prod.yml` | Production | backend + redis + nginx (nginx on 80/443) |

### 2.4 Nginx Configuration

The included `nginx/nginx.conf` provides:
- Reverse proxy to backend
- Gzip compression
- Rate limiting (10 RPS API, 5/min auth)
- HTTP → HTTPS redirect (uncomment SSL section)

For SSL, place certificates in `nginx/ssl/`:
```bash
nginx/ssl/
├── cert.pem
└── key.pem
```

Then uncomment the HTTPS server block in `nginx/nginx.conf`.

### 2.5 Health Checks

All services include health checks:

```bash
# Backend health
curl http://localhost:3000/api/health

# Catalog health (admin only)
curl -H "Cookie: atv_token=YOUR_ADMIN_TOKEN" http://localhost:3000/api/admin/health

# Redis health
docker-compose exec redis redis-cli ping

# View container health
docker ps
```

---

## 3. Local Testing (No Docker)

```bash
cd backend

# Install dependencies
npm install

# Start server
npm start

# Test health
curl http://localhost:3000/api/health
```

---

## 4. Android Connection

| Target | `BASE_URL` in Android |
|---|---|
| Android Emulator | `http://10.0.2.2:3000/` |
| Real TV / Phone (same Wi-Fi) | `http://YOUR_PC_IP:3000/` |
| Production (Docker + Nginx) | `https://your-domain.com/` |

**Find your PC IP:**
```powershell
# Windows PowerShell
Get-NetIPAddress | Where-Object {$_.AddressFamily -eq "IPv4" -and $_.IPAddress -notlike "127.*"} | Select-Object IPAddress
```

Example: if your PC IP is `192.168.1.42`, set:
```kotlin
const val BASE_URL = "http://192.168.1.42:3000/"
```

> ⚠️ **Firewall:** Make sure Windows Firewall allows port 3000 for private networks.

---

## 5. Update Android App

Change `AmbientBackendApi.BASE_URL` in `data/remote/api/AmbientBackendApi.kt`:

```kotlin
// For Docker production with nginx
const val BASE_URL = "https://your-domain.com/"

// For local development with emulator
const val BASE_URL = "http://10.0.2.2:3000/"
```

Also update `local.properties` with the same `APP_SECRET`:
```properties
APP_SECRET=atv_prod_2026_4f8a9b2c1d3e5f6a7b8c9d0e1f2a3b4c
```

---

## 6. Monitoring & Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f redis
docker-compose logs -f nginx

# Resource usage
docker stats

# Enter container for debugging
docker-compose exec backend sh
docker-compose exec redis sh
```

---

## 7. Backup & Restore

### Backup SQLite database

```bash
# Create backup
docker-compose exec backend sh -c "cp /app/data/ambienttv.db /app/backups/ambienttv-$(date +%Y%m%d).db"

# Copy to host
docker cp ambienttv-backend:/app/backups/ambienttv-20260101.db ./backups/
```

### Restore from backup

```bash
# Stop backend
docker-compose stop backend

# Restore database
docker cp ./backups/ambienttv-20260101.db ambienttv-backend:/app/data/ambienttv.db

# Restart
docker-compose start backend
```

---

## 8. Google Play Release Checklist

Before uploading to Google Play:

- [ ] Update `BASE_URL` to production domain
- [ ] Rotate `APP_SECRET` and update both backend + Android `local.properties`
- [ ] Enable R8/ProGuard minification in `app/build.gradle.kts` (`isMinifyEnabled = true`)
- [ ] Remove `android:usesCleartextTraffic="true"` if present (HTTPS only)
- [ ] Test on real Android TV device (not just emulator)
- [ ] Add privacy policy URL in Google Play Console
- [ ] Verify all content licenses (Pexels, Pixabay, Archive.org are CC0/royalty-free)

---

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 already in use | Change ports in `docker-compose.yml` or stop conflicting service |
| `Permission denied` on volumes | Run `chmod -R 777 ./backend/data` (Linux/Mac) |
| Redis connection failed | Check `REDIS_URL=redis://redis:6379` in docker-compose |
| Nginx 502 Bad Gateway | Verify backend is healthy: `docker-compose ps` |
| SSL certificate error | Ensure certificates are in `nginx/ssl/` and nginx.conf is correct |
| Database locked | SQLite doesn't support concurrent writes — ensure single backend instance or use PostgreSQL |
| Broken video/audio | Run `node scripts/validate-catalog.js` to check URLs |
| Local media not loading | Check `/media` directory exists and files are present |

---

## 10. Security Features

| Feature | Implementation |
|---------|---------------|
| Non-root containers | `USER nodejs` (UID 1000) in Dockerfile |
| Secrets isolation | `.env` mounted at runtime, not baked into image |
| Network isolation | Dedicated Docker bridge network `ambienttv-net` |
| Rate limiting | Nginx (10 RPS) + Express rate-limiter |
| Health checks | Docker healthcheck on all services |
| Resource limits | Memory/CPU limits in production compose |
| Input sanitization | XSS protection via `sanitize.js` middleware |
| JWT auth | httpOnly cookies with `SameSite=Strict` |

---

## 11. New Features (2026-06-01)

### Keyboard Shortcuts
13 hotkeys in player: Space, ←→↑↓, F, M, N, P, R, S, H, 0-9. Press ⌨️ for help.

### Playlists
Create custom playlists from category pairs. UI in web app: 📂 Плейлисты section.

### Auto-DJ
Random track switching every 3-5 minutes. Toggle with 🎲 button or `D` key.

### Picture-in-Picture
Native PiP support. Toggle with 🖼️ button or `I` key.

### Cross-Device Resume
Progress syncs every 10 seconds. Resume playback on any device where you're logged in.

### Smart Suggestions
Time-based recommendations: morning (nature), afternoon (fantasy), evening (cyberpunk), night (lofi).

### Content Health Monitoring
Admin endpoint `/api/admin/health` checks all catalog URLs and reports broken ones.

### Dark/Light Themes
Toggle with 🌙/☀️ button in header. Preference saved in localStorage.

### Local Media Hosting
Download media locally with `node scripts/download-media.js`. Served via `/media` static route.

---

## File Structure

```
ambienttv/
├── backend/
│   ├── Dockerfile              # Multi-stage production build
│   ├── .env                    # Secrets (not in git)
│   ├── scripts/
│   │   ├── validate-catalog.js # URL validation
│   │   ├── rebuild-catalog.js  # Rebuild with external URLs
│   │   └── download-media.js   # Download media locally
│   └── ...
├── web/                        # Static web app
├── nginx/
│   ├── nginx.conf              # Reverse proxy config
│   └── ssl/                    # SSL certificates
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production (+nginx)
├── deploy-docker.sh            # Deployment script
├── .dockerignore               # Build context exclusions
└── DEPLOY.md                   # This file
```
