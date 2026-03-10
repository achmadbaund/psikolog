# Railway Deployment Guide

## ⚠️ Railway TIDAK Support Docker Compose!

Railway tidak bisa deploy `docker-compose.yml` langsung. Anda harus deploy **setiap service terpisah**.

---

## 🚀 Cara Deploy ke Railway (Manual)

### Langkah 1: Sign Up Railway
1. Buka: https://railway.app
2. Sign up dengan GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**

---

### Langkah 2: Deploy PostgreSQL Service

1. Di project Railway, klik **"New Service"** → **"Database"** → **"Add PostgreSQL"**
2. Railway akan otomatis membuat database
3. **SIMPAN** database credentials dari Variables tab:
   - `PGHOST` (DB_HOST)
   - `PGPORT` (DB_PORT)
   - `PGUSER` (DB_USER)
   - `PGPASSWORD` (DB_PASSWORD)
   - `PGDATABASE` (DB_NAME)

---

### Langkah 3: Deploy Faskes Service

1. Klik **"New Service"** → **"Deploy from GitHub repo"**
2. Pilih repo `achmadbaund/psikolog`
3. **Root Directory**: `faskes-service`
4. **Builder**: Dockerfile (auto-detect)
5. Klik **"Deploy"**

**Set Environment Variables:**
```bash
PORT=8009
```

**Health Check:**
- Path: `/health`
- Port: `8009`

---

### Langkah 4: Deploy Booking Service

1. Klik **"New Service"** → **"Deploy from GitHub repo"**
2. Pilih repo `achmadbaund/psikolog`
3. **Root Directory**: `booking-service`
4. **Builder**: Dockerfile (auto-detect)
5. Klik **"Deploy"**

**Set Environment Variables:**
```bash
# Dari PostgreSQL service (Langkah 2):
DB_HOST=<dari PGHOST>
DB_PORT=<dari PGPORT>
DB_USER=<dari PGUSER>
DB_PASSWORD=<dari PGPASSWORD>
DB_NAME=<dari PGDATABASE>

# Dari Faskes service (Langkah 3):
FASKES_SERVICE_URL=<public URL faskes service>

# Application config:
NODE_ENV=production
PORT=8003
```

**Health Check:**
- Path: `/health`
- Port: `8003`

---

## 🔍 Debug Health Check Failure

### Masalah: "service unavailable" pada `/health`

**Penyebab Umum:**

1. **Port tidak sesuai**
   - Railway set PORT via environment variable
   - Booking service harus baca `process.env.PORT`

   **SUDAH DIFIX** ✅ di `booking-service/src/main.ts`:
   ```typescript
   const port = process.env.PORT || 8003;
   await app.listen(port);
   ```

2. **Start command salah**
   - Jangan pakai `start:dev` (nodemon) di production
   - Pakai `start` untuk production

   **SUDAH DIFIX** ✅ di `booking-service/Dockerfile`:
   ```dockerfile
   CMD ["npm", "run", "start"]
   ```

3. **Database connection error**
   - Cek apakah env vars sudah benar
   - Pastikan PostgreSQL service sudah running

4. **Build error**
   - Cek logs di Railway untuk error message

---

## 📋 Railway Environment Variables Reference

### Booking Service Variables:

| Variable | Value | Source |
|----------|-------|--------|
| `DB_HOST` | `<dari PGHOST>` | Railway PostgreSQL service |
| `DB_PORT` | `<dari PGPORT>` | Railway PostgreSQL service |
| `DB_USER` | `<dari PGUSER>` | Railway PostgreSQL service |
| `DB_PASSWORD` | `<dari PGPASSWORD>` | Railway PostgreSQL service |
| `DB_NAME` | `<dari PGDATABASE>` | Railway PostgreSQL service |
| `FASKES_SERVICE_URL` | `https://faskes-service.railway.app` | Faskes service URL |
| `NODE_ENV` | `production` | Manual set |
| `PORT` | `8003` | Railway auto-set |

### Faskes Service Variables:

| Variable | Value | Source |
|----------|-------|--------|
| `PORT` | `8009` | Manual set |

---

## 🧪 Testing Railway Deployment

### Test Faskes Service:
```bash
curl https://faskes-service.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-10T...",
  "service": "faskes-service"
}
```

### Test Booking Service:
```bash
curl https://booking-service.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-10T...",
  "service": "booking-service"
}
```

### Test Psychologists API:
```bash
curl https://booking-service.railway.app/psychologists
```

### Test Ingestion:
```bash
curl -X POST https://booking-service.railway.app/psychologists/ingest
```

---

## 🔄 Alternative: Gunakan Render.com

Kalau Railway terlalu rumit (3 services terpisah), **RECOMMENDED** gunakan Render.com:

✅ Render support **Blueprint** dari `render.yaml`
✅ Auto-deploy semua sekaligus (PostgreSQL + 2 services)
✅ Auto-fill database environment variables

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan Render.com.

---

## ✅ Railway Deployment Checklist

- [ ] PostgreSQL service deployed
- [ ] Faskes service deployed
- [ ] Booking service deployed
- [ ] Environment variables set untuk booking service
- [ ] Health checks passing untuk semua services
- [ ] Test psychologists endpoint
- [ ] Test ingestion endpoint

---

## 🆘 Troubleshooting

### Health Check Keep Failing:

1. **Cek Railway Logs:**
   - Buka service → View Logs
   - Cari error messages

2. **Cek Environment Variables:**
   - Buka service → Variables tab
   - Pastikan semua vars sudah set

3. **Rebuild Service:**
   - Klik "New Deployment"
   - Pilih "Rebuild without cache"

4. **Cek Port:**
   - Pastikan app baca `process.env.PORT`
   - Jangan hardcode port 8003

5. **Test Lokal Dulu:**
   ```bash
   docker build -t test .
   docker run -p 8003:8003 -e PORT=8003 test
   curl http://localhost:8003/health
   ```

---

**Last Updated:** 2026-03-10
