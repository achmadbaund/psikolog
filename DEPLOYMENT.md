# Deployment Architecture Guide

## 🏠 Local Development (Docker Compose)

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Network                         │
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Booking    │ ───> │   PostgreSQL │               │
│  │   Service    │      │   Container  │               │
│  │  Port: 8003  │      │  Port: 5432  │               │
│  └──────────────┘      └──────────────┘               │
│         │                                                 │
│         │ DB_HOST=postgres (service name)               │
│         │ DB_PORT=5432                                   │
└─────────┴─────────────────────────────────────────────┘
```

**Environment Variables (.env):**
```bash
DB_HOST=postgres          # ← Docker service name
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=psikolog_db
FASKES_SERVICE_URL=http://faskes-service:8009  # ← Docker service
```

**Key Points:**
- ✅ PostgreSQL berjalan sebagai container di Docker network
- ✅ Booking service connect ke `postgres` (service name)
- ✅ Faskes service connect ke `http://faskes-service:8009`
- ✅ Semua dalam satu Docker network

---

## 🚀 Production (Render.com)

```
┌──────────────────────────────────────────────────────────────────┐
│                         RENDER.COM CLOUD                         │
│                                                                  │
│  ┌─────────────────────┐      ┌──────────────────────────────┐ │
│  │   Booking Service   │      │   Managed PostgreSQL         │ │
│  │   (Web Service)     │ ───> │   (Database Service)         │ │
│  │   psikolog-booki..  │      │   psikolog-db                │ │
│  │   .onrender.com     │      │   (Internal DNS)             │ │
│  └─────────────────────┘      └──────────────────────────────┘ │
│           │                                                         │
│           │ DB_HOST=dpg-xxx.ap-southeast-1.aws.neon.tech          │
│           │     (Render internal DNS)                             │
│           │                                                         │
│           │                                                         │
│  ┌─────────────────────┐                                          │
│  │   Faskes Service    │                                          │
│  │   (Web Service)     │                                          │
│  │   psikolog-fask..   │                                          │
│  │   .onrender.com     │                                          │
│  └─────────────────────┘                                          │
│                                                                  │
│  FASKES_SERVICE_URL=https://psikolog-faskes-service.onrender.com │
└──────────────────────────────────────────────────────────────────┘
```

**Environment Variables (Render Auto-fill):**
```bash
# === AUTO-FILLED by Render from PostgreSQL Service ===
DB_HOST=dpg-abc123.ap-southeast-1.aws.neon.tech  # ← Render internal DNS
DB_PORT=5432
DB_USER=render_xyz123                            # ← Auto-generated
DB_PASSWORD=AbCdEf12345678                       # ← Auto-generated
DB_NAME=psikolog_db

# === SET MANUALLY ===
FASKES_SERVICE_URL=https://psikolog-faskes-service.onrender.com
NODE_ENV=production
PORT=8003
```

**Key Points:**
- ✅ PostgreSQL adalah **managed service terpisah** di Render
- ✅ Booking service connect via **internal Render DNS**
- ✅ Render auto-generate username/password
- ✅ Faskes service connect via **public Render URL**

---

## 📋 Perbedaan Utama:

| Aspect | Local Docker | Render.com |
|--------|--------------|------------|
| **PostgreSQL** | Container di Docker | Managed Service terpisah |
| **DB_HOST** | `postgres` (service name) | `dpg-xxx.aws.neon.tech` (internal DNS) |
| **DB_USER** | `postgres` | `render_xyz123` (auto-generated) |
| **DB_PASSWORD** | `postgres` | Auto-generated |
| **Faskes URL** | `http://faskes-service:8009` | `https://psikolog-faskes-service.onrender.com` |
| **Network** | Docker bridge network | Render internal network |

---

## 🔧 Cara Render Auto-fill Environment Variables:

Di `render.yaml`, kita gunakan `fromDatabase`:

```yaml
envVars:
  - key: DB_HOST
    fromDatabase:
      name: psikolog-db      # ← Nama PostgreSQL service
      property: host         # ← Auto-fill host property

  - key: DB_PORT
    fromDatabase:
      name: psikolog-db
      property: port         # ← Auto-fill port property

  - key: DB_USER
    fromDatabase:
      name: psikolog-db
      property: user         # ← Auto-fill user property

  - key: DB_PASSWORD
    fromDatabase:
      name: psikolog-db
      property: password     # ← Auto-fill password property
```

Render akan otomatis mengisi env vars ini saat deployment!

---

## ✅ Checklist Deployment:

### Local Development:
- [x] Docker Compose running
- [x] PostgreSQL container aktif
- [x] DB_HOST=postgres
- [x] Faskes service aktif di port 8009
- [x] Booking service aktif di port 8003

### Render.com Production:
- [ ] Blueprint sudah di-apply
- [ ] PostgreSQL database created
- [ ] Faskes service deployed
- [ ] Booking service deployed
- [ ] Environment variables auto-filled ✅
- [ ] Health checks passing
- [ ] Services accessible via public URL

---

## 🧪 Testing Connection:

### Local:
```bash
# Test PostgreSQL connection
docker exec -it psikolog-postgres psql -U postgres -d psikolog_db

# Test Faskes service
curl http://localhost:8009/health

# Test Booking service
curl http://localhost:8003/health
```

### Render:
```bash
# Test Booking service (public URL)
curl https://psikolog-booking-service.onrender.com/health

# Test Faskes service (public URL)
curl https://psikolog-faskes-service.onrender.com/health

# Test Psychologists API
curl https://psikolog-booking-service.onrender.com/psychologists
```
