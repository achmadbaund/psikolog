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

**⚡ CARA MUDAH: Connect PostgreSQL Service**

Setelah deploy selesai:
1. Buka Booking Service di Railway
2. Klik tab **"Variables"**
3. Klik **"New Variable"**
4. Pilih **"Reference"** (ikon 🔗)
5. Pilih **PostgreSQL service** dari Langkah 2
6. Railway akan otomatis buat:
   - `DATABASE_URL` = `postgres://user:pass@host:port/db` ✅
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` ✅

**Atau SET MANUAL (kalau Reference tidak work):**
```bash
# Buka PostgreSQL service → Variables tab, copy values:
DB_HOST=<dari PGHOST>
DB_PORT=5432
DB_USER=<dari PGUSER>
DB_PASSWORD=<dari PGPASSWORD>
DB_NAME=<dari PGDATABASE>
```

**Environment Variables (Manual set):**
```bash
FASKES_SERVICE_URL=<public URL faskes service dari Langkah 3>
NODE_ENV=production
```

**Health Check:**
- Path: `/health`
- Port: `8003`

---

### Langkah 5: Verify Railway Deployment

1. **Cek Logs:**
   - Buka masing-masing service
   - Klik tab **"View Logs"**
   - Pastikan tidak ada error

2. **Test Health Checks:**
   ```bash
   # Faskes Service
   curl https://faskes-service.railway.app/health

   # Booking Service
   curl https://booking-service.railway.app/health
   ```

3. **Test API:**
   ```bash
   # Test Psychologists API
   curl https://booking-service.railway.app/psychologists

   # Test Ingestion
   curl -X POST https://booking-service.railway.app/psychologists/ingest
   ```

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

| Variable | Value | Source | Required |
|----------|-------|--------|----------|
| `DATABASE_URL` | `postgres://user:pass@host:port/db` | Railway PostgreSQL (Auto-fill) | ⭐ **Recommended** |
| `DB_HOST` | `<dari PostgreSQL service>` | Railway PostgreSQL | Optional |
| `DB_PORT` | `5432` | Railway PostgreSQL | Optional |
| `DB_USER` | `<dari PostgreSQL service>` | Railway PostgreSQL | Optional |
| `DB_PASSWORD` | `<dari PostgreSQL service>` | Railway PostgreSQL | Optional |
| `DB_NAME` | `psikolog_db` | Manual set | Optional |
| `FASKES_SERVICE_URL` | `https://faskes-service.railway.app` | Faskes service URL | ✅ Required |
| `NODE_ENV` | `production` | Manual set | ✅ Required |
| `PORT` | `8003` | Railway auto-set | ✅ Auto |

**⚡ CARA TERMUDAH:**
Railway otomatis set `DATABASE_URL` ketika Anda connect PostgreSQL service ke booking service!

**Cara Connect:**
1. Booking Service → Settings → Variables
2. Klik "New Variable"
3. Atau pilih "Reference" dan pilih PostgreSQL service
4. Railway akan otomatis inject `DATABASE_URL`

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
