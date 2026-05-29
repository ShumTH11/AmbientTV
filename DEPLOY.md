# AmbientTV — Deployment Guide

## Backend Architecture

```
┌─────────────┐      HTTPS       ┌─────────────────────────────┐      HTTPS      ┌──────────────┐
│  Android TV │  ─────────────►  │  Node.js Backend (Fly.io)   │  ────────────►  │  Pexels API  │
│             │   httpOnly Cookie │  • Holds all API keys       │                 │  YouTube API │
│  (no keys)  │                  │  • Enforces auth            │                 │  Pixabay API │
└─────────────┘                  │  • Proxies search           │                 │  Coverr API  │
                                 └─────────────────────────────┘                 └──────────────┘
```

---

## Prerequisites

- [Fly.io](https://fly.io) account (free tier available)
- [Fly CLI](https://fly.io/docs/flyctl/install/) installed
- Docker (optional, for local testing)

---

## 1. Configure Secrets

Edit `backend/.env` (already done in repo):
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

## 2. Local Deployment (No Cloud / No Credit Card)

If you don't have a card for cloud verification, run the backend locally on your PC using Docker.

### Option A: Docker Compose (Recommended)

```bash
cd "E:\Ambient TV\ambienttv\backend"

# Build and start
docker-compose up --build

# Run in background
docker-compose up --build -d

# Stop
docker-compose down
```

Backend will be available at `http://localhost:3000`

### Option B: Direct Node.js (for development)

```bash
cd "E:\Ambient TV\ambienttv\backend"
npm install
npm start
```

### Android Connection to Local Backend

| Target | `BASE_URL` in Android |
|---|---|
| Android Emulator | `http://10.0.2.2:3000/` |
| Real TV / Phone (same Wi-Fi) | `http://YOUR_PC_IP:3000/` |

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

## 3. Deploy to Fly.io (Cloud, when you get a card)

```bash
cd backend

# Login (first time only)
flyctl auth login

# Launch app (creates app on Fly.io)
flyctl launch --name ambienttv-backend --region waw --no-deploy

# Set secrets (never commit .env to git!)
flyctl secrets set APP_SECRET=atv_prod_2026_4f8a9b2c1d3e5f6a7b8c9d0e1f2a3b4c
flyctl secrets set ADMIN_PASSWORD_HASH='$2b$10$...'
flyctl secrets set ALLOWED_ORIGINS='https://yourdomain.com,https://ambienttv-backend.fly.dev'
flyctl secrets set PEXELS_API_KEY=your_key
flyctl secrets set PIXABAY_API_KEY=your_key
flyctl secrets set YOUTUBE_API_KEY=your_key
flyctl secrets set COVERR_API_KEY=your_key

# Deploy
flyctl deploy

# Check status
flyctl status
```

Your backend will be available at `https://ambienttv-backend.fly.dev`

---

## 5. Update Android App

Change `AmbientBackendApi.BASE_URL` in `data/remote/api/AmbientBackendApi.kt`:

```kotlin
const val BASE_URL = "https://ambienttv-backend.fly.dev/"
```

For local development with emulator, keep:
```kotlin
const val BASE_URL = "http://10.0.2.2:3000/"
```

Also update `local.properties` with the same `APP_SECRET` so the Android app can authenticate:
```properties
APP_SECRET=atv_prod_2026_4f8a9b2c1d3e5f6a7b8c9d0e1f2a3b4c
```

---

## 6. Local Testing (Docker)

```bash
cd backend

# Build image
docker build -t ambienttv-backend .

# Run container
docker run -p 3000:3000 --env-file .env ambienttv-backend

# Test health (open endpoint)
curl http://localhost:3000/api/health

# Test catalog (protected)
curl -H "Authorization: Bearer atv_prod_2026_4f8a9b2c1d3e5f6a7b8c9d0e1f2a3b4c" \
     http://localhost:3000/api/catalog
```

---

## 7. Google Play Release Checklist

Before uploading to Google Play:

- [ ] Update `BASE_URL` to production domain
- [ ] Rotate `APP_SECRET` and update both backend + Android `local.properties`
- [ ] Enable R8/ProGuard minification in `app/build.gradle.kts` (`isMinifyEnabled = true`)
- [ ] Remove `android:usesCleartextTraffic="true"` if present (HTTPS only)
- [ ] Test on real Android TV device (not just emulator)
- [ ] Add privacy policy URL in Google Play Console
- [ ] Verify all content licenses (Pexels, Pixabay, Archive.org are CC0/royalty-free)

---

## 8. Monitoring & Logs

```bash
# View live logs
flyctl logs

# SSH into machine (for debugging)
flyctl ssh console
```

---

## Free Tier Limits (Fly.io)

- **VM:** 256 MB RAM, shared CPU — enough for this backend
- **Bandwidth:** 160 GB/month outbound (more than enough for API proxying)
- **If limits exceeded:** ~$2-5/month for light usage

For zero-cost alternatives, consider:
- **Google Cloud Run** (2M requests/month free)
- **Oracle Cloud Free Tier** (2 ARM servers forever free, but complex setup)
