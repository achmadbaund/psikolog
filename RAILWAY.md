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
| **Kafka Variables** | | | |
| `KAFKA_BROKERS` | `<kafka-service>.railway.internal:9092` | Kafka Shared Variable | Optional (⚠️ Required untuk async) |
| `KAFKA_TOPIC` | `booking-events` | Kafka Shared Variable | Optional (⚠️ Required untuk async) |
| `KAFKA_GROUP_ID` | `booking-processor` | Manual set | Optional (⚠️ Required untuk async) |

**⚡ CARA TERMUDAH:**
Railway otomatis set `DATABASE_URL` ketika Anda connect PostgreSQL service ke booking service!

**Cara Connect:**
1. Booking Service → Settings → Variables
2. Klik "New Variable"
3. Atau pilih "Reference" dan pilih PostgreSQL service
4. Railway akan otomatis inject `DATABASE_URL`

### Faskes Service Variables:

| Variable | Value | Source | Required |
|----------|-------|--------|----------|
| `PORT` | `8009` | Manual set | ✅ Required |
| **Kafka Variables** | | | |
| `KAFKA_BROKERS` | `<kafka-service>.railway.internal:9092` | Kafka Shared Variable | Optional (⚠️ Required untuk async) |
| `KAFKA_TOPIC` | `booking-events` | Kafka Shared Variable | Optional (⚠️ Required untuk async) |

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

### Test Kafka Booking Flow (Jika Kafka deployed):
```bash
# Create booking via Faskes Service (Producer)
curl -X POST https://faskes-service.railway.app/booking \
  -H "Content-Type: application/json" \
  -d '{
    "faskes_id": "550e8400-e29b-41d4-a716-446655440001",
    "dokter_id": "550e8400-e29b-41d4-a716-446655440101",
    "pasien_id": "user-001",
    "jadwal": "2026-03-15T10:00:00Z",
    "session_type": "VIDEO",
    "notes": "Konsultasi untuk kecemasan"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Booking request received and queued for processing",
  "data": {
    "booking_id": "abc-123-def-456",
    "status": "PENDING",
    "estimated_processing_time": "1-2 minutes"
  }
}
```

**Verify di Kafka UI:**
1. Buka Kafka UI: `https://kafka-<service-id>.railway.app`
2. Cek topic `booking-events`
3. Pastikan message muncul

**Verify Booking di Database:**
```bash
curl https://booking-service.railway.app/bookings
```

---

## 📡 Langkah 5: Deploy Kafka (Optional - Untuk Async Processing)

Railway sekarang support Kafka via template! Gunakan template ini untuk async booking flow.

### Deploy Kafka dari Template:

1. Buka: https://railway.com/deploy/kafka-wkafka-ui
2. Klik **"Deploy Now"**
3. Pilih project Railway Anda
4. Railway akan deploy:
   - ✅ Apache Kafka (KRaft mode - tanpa Zookeeper)
   - ✅ Kafka UI untuk observability

### Configure Kafka Shared Variables:

Setelah Kafka deploy, Railway akan otomatis membuat environment variables:

**Kafka Service Variables (Auto-generated):**
```bash
KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=<kafka-service>:9092
KAFKA_CLUSTERS_0_NAME=Local
KAFKA_CLUSTERS_0_PROPERTIES_SECURITY_PROTOCOL=PLAINTEXT
SERVER_PORT=8080
```

**Create Shared Variables untuk Kafka:**

**Step-by-Step:**

1. **Buka Project Settings**
   - Klik icon **Settings** ⚙️ di pojok kanan atas (project level)
   - Pilih **"Variables"** tab

2. **Create Shared Variables**
   - Klik **"New Variable"**
   - Tambahkan variables ini satu per satu:

   ```bash
   # Shared Variable 1
   Name: KAFKA_BROKERS
   Value: <kafka-service-name>.railway.internal:9092
   # Contoh: kafka-abc123def.railway.internal:9092

   # Shared Variable 2
   Name: KAFKA_TOPIC
   Value: booking-events

   # Shared Variable 3
   Name: KAFKA_GROUP_ID
   Value: booking-processor
   ```

3. **Verify Shared Variables**
   - Setelah dibuat, shared variables akan muncul di semua services
   - Ada icon 🔗 di sebelah nama variable

**Cara dapatkan Kafka service name:**
1. Buka Kafka service di Railway
2. Lihat URL: `https://kafka-1a2b3c.railway.app`
3. Service name: `kafka-1a2b3c`
4. Internal URL: `kafka-1a2b3c.railway.internal:9092`

**Architecture dengan Shared Variables:**

```
Project Settings (Shared Variables)
    ├── KAFKA_BROKERS ──┬──→ Faskes Service
    ├── KAFKA_TOPIC     │
    └── KAFKA_GROUP_ID └──→ Booking Service
```

**Benefits:**
- ✅ Single source of truth
- ✅ Update once, applies to all services
- ✅ Tidak perlu copy-paste ke setiap service

### Update Service Variables untuk Kafka:

**Faskes Service Variables:**
```bash
PORT=8009
KAFKA_BROKERS={{KAFKA_BROKERS}}  # Reference to shared variable
KAFKA_TOPIC={{KAFKA_TOPIC}}
```

**Booking Service Variables:**
```bash
# Database
DATABASE_URL=<reference PostgreSQL service>
NODE_ENV=production

# Kafka
KAFKA_BROKERS={{KAFKA_BROKERS}}  # Reference to shared variable
KAFKA_TOPIC={{KAFKA_TOPIC}}
KAFKA_GROUP_ID={{KAFKA_GROUP_ID}}
```

### Architecture dengan Kafka:

```
User → Faskes Service (Producer) → Kafka → Booking Service (Consumer) → PostgreSQL
```

**Benefits:**
- ✅ Async processing - Fast response ke user
- ✅ Decoupled services - Faskes & Booking independent
- ✅ Message persistence - Messages tetap ada meskipun service down
- ✅ Scalable - Kafka handle message queuing

---

## 🔄 Alternative: Gunakan Render.com

Kalau Railway terlalu rumit (3 services terpisah), **RECOMMENDED** gunakan Render.com:

✅ Render support **Blueprint** dari `render.yaml`
✅ Auto-deploy semua sekaligus (PostgreSQL + 2 services)
✅ Auto-fill database environment variables

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan Render.com.

---

## ✅ Railway Deployment Checklist

### Tanpa Kafka (Sync):
- [ ] PostgreSQL service deployed
- [ ] Faskes service deployed
- [ ] Booking service deployed
- [ ] Environment variables set untuk booking service
- [ ] Health checks passing untuk semua services
- [ ] Test psychologists endpoint
- [ ] Test ingestion endpoint

### Dengan Kafka (Async):
- [ ] Kafka service deployed dari template
- [ ] Kafka shared variables created (KAFKA_BROKERS, KAFKA_TOPIC)
- [ ] Faskes service connected to Kafka (Producer)
- [ ] Booking service connected to Kafka (Consumer)
- [ ] Test booking flow via Kafka topic
- [ ] Verify messages di Kafka UI

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

## 🔧 Railway Kafka Configuration Details

### Kafka Service di Railway:

Railway Kafka template menggunakan **KRaft mode** (tanpa Zookeeper):
- ✅ Single-broker Kafka
- ✅ Kafka UI otomatis include
- ✅ Private networking untuk internal communication

### Internal vs External Kafka:

**Untuk Docker Compose (Local):**
```bash
KAFKA_BROKERS=kafka:29092  # Docker network
```

**Untuk Railway (Production):**
```bash
# Format: <kafka-service-name>.railway.internal:9092
KAFKA_BROKERS=kafka-1a2b3c.railway.internal:9092
```

**Cara dapatkan Kafka service name:**

Option 1: Dari Kafka service URL
```
https://kafka-abc123def.railway.app
         ^^^^^^^^^^^^^^
         Service name = kafka-abc123def
```

Option 2: Dari Railway dashboard
1. Buka Kafka service
2. Klik "Settings" → "General"
3. Lihat "Service Name"
4. Internal URL: `<service-name>.railway.internal:9092`

### Kafka UI Access:

**URL Format:**
```
https://kafka-abc123def.railway.app
```

**What you can see:**
- Topics: `booking-events`
- Messages: Real-time booking events
- Consumer groups: `booking-processor`
- Brokers: 1 broker connected

---

**Last Updated:** 2026-03-10
