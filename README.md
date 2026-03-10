# Psychology Booking Pipeline - Data Pipeline Project

A complete booking pipeline for psychology consultation services built with Flask API, NestJS, and PostgreSQL using Docker Compose.

## 🎯 Architecture Overview

```
┌─────────────────┐      ┌──────────────────────────┐      ┌─────────────────┐
│  Faskes API      │ ───> │  NestJS                   │ ───> │  PostgreSQL     │
│  (Mock Server)   │      │  Booking Psikologi Service│      │  (Database)     │
│  Port: 8009      │      │  Port: 8003               │      │  Port: 5432      │
└─────────────────┘      └──────────────────────────┘      └─────────────────┘

🏥 Healthcare Data         🧠 Psychology Booking Logic    💾 Persistent Storage
Dokter/Layanan/Jadwal    Psychologist Consultation     Bookings & Video Sessions
                          & Ingestion Pipeline
```

## 🔄 Data Flow (Ingestion Pipeline)

```
┌──────────────────┐
│ BPJS/Allo Bank   │
│ External APIs    │
└────────┬─────────┘
         │ (sync)
         ↓
┌──────────────────┐
│  Faskes Service  │ ← Mock Data (JSON)
│  Port: 8009      │   - 5 Faskes
│  Flask           │   - 5 Dokter
└────────┬─────────┘
         │ GET /faskes, /faskes/{id}/dokter
         ↓
┌──────────────────────────────┐
│  Booking Psikologi Service  │
│  POST /psychologists/ingest │ ← INGESTION ENDPOINT
│  Port: 8003                 │
│  NestJS + TypeORM           │
└────────┬─────────────────────┘
         │ (save)
         ↓
┌──────────────────┐
│  PostgreSQL      │
│  Port: 5432      │
│  - psychologist  │
│  - booking       │
│  - booking_session│
└──────────────────┘
```

## 📊 Services Overview

### 1. Faskes Service (Mock Server)
- **Port**: 8009
- **Framework**: Flask
- **Purpose**: Serves healthcare facility data (Faskes, Dokter, Layanan)
- **Role**: Data Provider (similar to Flask Mock in assessment)

**Endpoints:**
- `GET /health` - Health check
- `GET /faskes` - List all faskes with pagination
- `GET /faskes/{id}` - Get faskes detail with dokter & layanan
- `GET /faskes/{id}/dokter` - List dokter at faskes
- `GET /faskes/{id}/layanan` - List layanan at faskes
- `GET /dokter/{id}/jadwal` - Get dokter schedule

### 2. Booking Psikologi Service (NestJS)
- **Port**: 8003
- **Framework**: NestJS (TypeScript)
- **Purpose**: Manage psychology consultation bookings
- **Role**: Main Application (similar to FastAPI Pipeline)

**Endpoints:**
- `GET /bookings` - List all psychology bookings with filters
- `POST /bookings` - Create new psychology booking
- `GET /bookings/{id}` - Get booking details
- `PUT /bookings/{id}` - Update booking (reschedule)
- `DELETE /bookings/{id}` - Cancel booking
- `POST /bookings/{id}/join` - Join video consultation session

### 3. PostgreSQL Database
- **Port**: 5432
- **Database**: `psikolog_db`
- **Tables**: bookings, booking_sessions, psychologists

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (running)
- Node.js 18+ (for local NestJS development)
- Python 3.10+ (for local Flask development)
- Docker Compose v2+

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Variables:**
- `DB_HOST` - PostgreSQL host (default: `postgres` for Docker)
- `DB_PORT` - PostgreSQL port (default: `5432`)
- `DB_USER` - PostgreSQL username (default: `postgres`)
- `DB_PASSWORD` - PostgreSQL password (default: `postgres`)
- `DB_NAME` - Database name (default: `psikolog_db`)
- `FASKES_SERVICE_URL` - Faskes service URL (default: `http://faskes-service:8009`)

**Optional Variables:**
- `NODE_ENV` - Environment mode (default: `development`)
- `PORT` - Booking service port (default: `8003`)
- `BPJS_API_KEY` - BPJS API key for production
- `ALLO_BANK_API_KEY` - Allo Bank API key for production
- `JWT_SECRET` - JWT secret for authentication
- `CORS_ORIGIN` - CORS allowed origins (default: `*`)

### Start All Services

```bash
cd /Users/baundx/Downloads/psikolog
docker compose up -d --build
```

### Verify Services

```bash
# Check all containers are running
docker compose ps

# Test Faskes Service
curl http://localhost:8009/health

# Test Booking Service
curl http://localhost:8003
```

## 🧪 Testing the Pipeline

### Test 1: List Faskes (Mock Data)

```bash
curl "http://localhost:8009/faskes?page=0&size=2"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nama_faskes": "Klinik Sehat Mental Jakarta",
      "jenis_faskes": "KLINIK",
      ...
    }
  ],
  "pagination": {
    "page": 0,
    "size": 2,
    "totalElements": 5,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Test 2: Get Faskes Detail with Dokter

```bash
curl http://localhost:8009/faskes/550e8400-e29b-41d4-a716-446655440001
```

### Test 3: Nearby Search (Cari Faskes Terdekat)

```bash
curl -X POST http://localhost:8009/faskes/nearby \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -6.2088,
    "longitude": 106.8456,
    "radius": 5000,
    "jenis_faskes": "KLINIK"
  }'
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nama_faskes": "Klinik Sehat Mental Jakarta",
      "distance_km": 2.5,
      ...
    }
  ],
  "pagination": {
    "page": 0,
    "size": 20,
    "totalElements": 3
  }
}
```

### Test 4: External Sync (BPJS/Allo Bank)

```bash
curl -X POST http://localhost:8009/external/sync \
  -H "Content-Type: application/json" \
  -d '{
    "source": "BPJS",
    "force_full_sync": true
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "source": "BPJS",
  "sync_time": "2024-03-15T10:00:00Z",
  "stats": {
    "faskes_created": 5,
    "faskes_updated": 0,
    "dokter_created": 5,
    "layanan_created": 15
  },
  "message": "Successfully synced data from BPJS"
}
```

### Test 5: Ingest Psychologists from Faskes Service

```bash
# Import psychologist data dari Faskes Service
curl -X POST http://localhost:8003/psychologists/ingest
```

**Expected Response:**
```json
{
  "status": "success",
  "records_processed": 5,
  "records_created": 5,
  "records_updated": 0,
  "faskes_processed": 5,
  "message": "Successfully ingested 5 psychologists from 5 faskes"
}
```

### Test 6: List Ingested Psychologists

```bash
curl http://localhost:8003/psychologists
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "doc-001",
      "faskesId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Dr. Sarah Wijaya, Sp.Ps",
      "specialization": ["Psikologi Klinis"],
      "rating": 4.5,
      "experienceYears": 5,
      "pricePerSession": 500000,
      "kontak": "0812-3456-7890",
      "fotoDokter": "https://example.com/dokter/sarah-wijaya.jpg",
      "jadwalPraktik": [...]
    }
  ]
}
```

### Test 7: Get Psychologist Detail

```bash
curl http://localhost:8003/psychologists/doc-001
```

### Test 8: Create Booking with Psychologist ID

```bash
curl -X POST http://localhost:8003/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "psychologistId": "doc-001",
    "scheduledAt": "2024-03-15T10:00:00Z",
    "durationMinutes": 60,
    "sessionType": "VIDEO",
    "notes": "Konsultasi untuk kecemasan"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid...",
  "userId": "user-uuid...",
  "psychologistId": "doc-001",
  "status": "PENDING",
  "scheduledAt": "2024-03-15T10:00:00.000Z",
  ...
}
```

### Test 9: List Bookings

```bash
curl http://localhost:8003/bookings
```

## 🔄 Ingestion Pipeline

### How It Works

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  Faskes Service  │ ───> │  Booking Service     │ ───> │  PostgreSQL     │
│  (Port 8009)    │      │  Ingest Endpoint     │      │  Database       │
│                 │      │  /psychologists/ingest│      │                 │
└─────────────────┘      └──────────────────────┘      └─────────────────┘

     Mock Data              Transform & Save         Psychologists Table
  5 Faskes, 5 Dokter          as Records             (5 records)
```

### Ingestion Steps

1. **Fetch Faskes**: Booking Service calls `GET /faskes` from Faskes Service
2. **Fetch Dokter**: For each faskes, calls `GET /faskes/{id}/dokter`
3. **Transform Data**: Maps dokter data to psychologist entity
4. **Upsert to Database**: Creates or updates psychologist records

### Data Mapping

| Faskes Service (dokter.json) | Booking Service (psychologist) |
|------------------------------|--------------------------------|
| `id` (UUID) | `id` (UUID) ✅ |
| `faskes_id` (UUID) | `faskesId` (VARCHAR) |
| `nama_dokter` | `name` |
| `spesialisasi` | `specialization` (array) |
| `kontak` | `kontak` |
| `foto_dokter` | `fotoDokter` |
| `jadwal_praktik` | `jadwalPraktik` (JSON) |
| - | `rating` (default: 4.5) |
| - | `experienceYears` (default: 5) |
| - | `pricePerSession` (default: 500000) |

### Why This Pattern?

- **Loose Coupling**: Faskes Service tidak perlu tahu tentang Booking Service
- **Independent Data Sources**: Booking Service berjalan walau Faskes Service down
- **Data Ownership**: Faskes Service owner data master, Booking Service punya copy
- **Scalability**: Bisa ingest multiple times tanpa duplicate (upsert logic)
- **UUID Best Practice**: Menggunakan UUID untuk primary keys ensures:
  - ✅ Globally unique identifiers
  - ✅ No ID collisions across systems
  - ✅ Better distributed systems support
  - ✅ More secure than sequential IDs

## 📁 Project Structure

```
psikolog/
├── docker-compose.yml           # Orchestration
├── README.md                    # This file
├── faskes-service/             # Flask Mock Server
│   ├── app.py                  # Flask application
│   ├── data/
│   │   ├── faskes.json          # Mock faskes data (5 items)
│   │   └── dokter.json          # Mock dokter data (5 items)
│   ├── Dockerfile
│   └── requirements.txt
└── booking-service/            # NestJS Booking Service
    ├── src/
    │   ├── main.ts              # Entry point
    │   ├── app.module.ts         # Root module
    │   ├── booking/             # Booking module
    │   │   ├── booking.controller.ts
    │   │   ├── booking.service.ts
    │   │   ├── booking.module.ts
    │   │   ├── entities/         # TypeORM entities
    │   │   │   └── booking.entity.ts
    │   │   └── dto/              # Data transfer objects
    │   │       ├── booking.dto.ts
    │   │       └── common.dto.ts
    │   └── psychologist/         # Psychologist module
    │       ├── psychologist.controller.ts
    │       ├── psychologist.service.ts
    │       ├── psychologist.module.ts
    │       └── entities/
    │           └── psychologist.entity.ts
    ├── package.json
    ├── tsconfig.json
    ├── nest-cli.json
    └── Dockerfile
```

## 🔧 Development

### Local Development

**Faskes Service (Flask):**
```bash
cd faskes-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Booking Service (NestJS):**
```bash
cd booking-service
npm install
npm run dev
```

### Database Connection

**Connect directly to PostgreSQL:**
```bash
docker compose exec postgres psql -U postgres -d psikolog_db
```

**Query bookings:**
```sql
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;
```

## 📊 Database Schema

### bookings table
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    psychologist_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    scheduled_at TIMESTAMP NOT NULL,
    consultation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### booking_sessions table
```sql
CREATE TABLE booking_sessions (
    id UUID PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    session_url TEXT,
    recording_url TEXT
);
```

### psychologists table
```sql
CREATE TABLE psychologists (
    id UUID PRIMARY KEY,                    -- UUID from Faskes Service
    faskes_id VARCHAR,
    name VARCHAR(255) NOT NULL,
    specialization TEXT[] NOT NULL,
    rating FLOAT NOT NULL DEFAULT 4.5,
    experience_years INTEGER NOT NULL DEFAULT 5,
    price_per_session FLOAT NOT NULL DEFAULT 500000,
    kontak VARCHAR,
    foto_dokter VARCHAR,
    jadwal_praktik JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🌐 API Documentation

### Faskes Service (Port 8009)
- Swagger UI: N/A (Flask, but OpenAPI spec provided)
- OpenAPI Spec: `faskes-service-api.yaml`
- Base URL: `http://localhost:8009`

### Booking Psikologi Service (Port 8003)
- **Swagger UI**: `http://localhost:8003/api` 🌟
- Swagger JSON: `http://localhost:8003/api-json`
- OpenAPI Spec: `booking-service-api.yaml`
- Base URL: `http://localhost:8003`

**Psychologists Endpoints:**
- `POST /psychologists/ingest` - Ingest psychologist data from Faskes Service 🆕
- `GET /psychologists` - List all psychologists
- `GET /psychologists/{id}` - Get psychologist detail

**Bookings Endpoints:**
- `GET /bookings` - List all bookings
- `POST /bookings` - Create new booking
- `GET /bookings/{id}` - Get booking detail
- `PUT /bookings/{id}` - Update booking (reschedule)
- `DELETE /bookings/{id}` - Cancel booking
- `POST /bookings/{id}/join` - Join video session

### Accessing Swagger UI
```bash
# Open in browser
open http://localhost:8003/api

# Or access via curl
curl http://localhost:8003/api
```

## 🔑 Key Features

### ✅ Implemented Features

1. **Faskes Service** (Mock Data Provider)
   - ✅ 5 mock faskes (healthcare facilities)
   - ✅ 5 mock dokter (psychologists)
   - ✅ Pagination support
   - ✅ Filter by jenis_faskes, search
   - ✅ Layanan (services) per faskes
   - ✅ Jadwal praktik dokter
   - ✅ **Nearby search** - Cari faskes terdekat berdasarkan lokasi
   - ✅ **External sync** - Sync data dari BPJS/Allo Bank API

2. **Booking Psikologi Service** (Main Application)
   - ✅ NestJS with TypeScript
   - ✅ TypeORM for database operations
   - ✅ Complete CRUD operations
   - ✅ Booking status management
   - ✅ Video session integration
   - ✅ Psychologist data management
   - ✅ **Swagger UI** - Interactive API documentation at `/api`
   - ✅ **Ingestion Pipeline** - Import psychologist data from Faskes Service

3. **Database**
   - ✅ PostgreSQL with proper schema
   - ✅ UUID primary keys
   - ✅ Foreign key relationships
   - ✅ Enum types for status

4. **Docker Orchestration**
   - ✅ 3 services configured
   - ✅ Health checks
   - ✅ Service dependencies
   - ✅ Custom network
   - ✅ Volume persistence

## 🧪 Testing Commands

```bash
# 1. Start all services
docker compose up -d

# 2. Check health status
curl http://localhost:8009/health
curl http://localhost:8003

# 3. List faskes
curl "http://localhost:8009/faskes?page=0&size=5"

# 4. Get faskes detail
curl http://localhost:8009/faskes/550e8400-e29b-41d4-a716-446655440001

# 5. List dokter at faskes
curl http://localhost:8009/faskes/550e8400-e29b-41d4-a716-446655440001/dokter

# 6. Nearby search (cari faskes terdekat)
curl -X POST http://localhost:8009/faskes/nearby \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -6.2088,
    "longitude": 106.8456,
    "radius": 5000
  }'

# 7. External sync (BPJS/Allo Bank)
curl -X POST http://localhost:8009/external/sync \
  -H "Content-Type: application/json" \
  -d '{
    "source": "BPJS",
    "force_full_sync": true
  }'

# 8. 🌟 INGEST: Import psychologists from Faskes Service
curl -X POST http://localhost:8003/psychologists/ingest

# 9. List ingested psychologists
curl http://localhost:8003/psychologists

# 10. Get psychologist detail
curl http://localhost:8003/psychologists/doc-001

# 11. Create booking (with valid psychologistId)
curl -X POST http://localhost:8009/external/sync \
  -H "Content-Type: application/json" \
  -d '{
    "source": "BPJS",
    "force_full_sync": true
  }'

# 11. Create booking (with valid psychologistId)
curl -X POST http://localhost:8003/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "psychologistId": "doc-001",
    "scheduledAt": "2024-03-15T10:00:00Z",
    "durationMinutes": 60,
    "sessionType": "VIDEO"
  }'

# 12. List bookings
curl http://localhost:8003/bookings

# 13. Get booking detail
curl http://localhost:8003/bookings/{bookingId}

# 14. Update booking
curl -X PUT http://localhost:8003/bookings/{bookingId} \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2024-03-16T14:00:00Z"
  }'

# 15. Cancel booking
curl -X DELETE http://localhost:8003/bookings/{bookingId}

# 16. Join video session
curl -X POST http://localhost:8003/bookings/{bookingId}/join
```

## 🔍 Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs faskes-service
docker compose logs booking-service
docker compose logs postgres
```

### Port conflicts
```bash
# Check what's using the ports
lsof -i :8009
lsof -i :8003
lsof -i :5432
```

### Database connection issues
```bash
# Verify PostgreSQL is ready
docker compose exec postgres pg_isready -U postgres -d psikolog_db

# Check database exists
docker compose exec postgres psql -U postgres -d psikolog_db -c "\dt"
```

### NestJS build issues
```bash
# Rebuild booking service
docker compose up -d --build booking-service

# Check build logs
docker compose logs booking-service --tail=50
```

## 📝 Notes

### Architecture Decisions

1. **Flask for Faskes Service**: Lightweight, perfect for serving mock data from JSON files
2. **NestJS for Booking Service**: Enterprise-grade framework with built-in dependency injection, validation, and TypeScript support
3. **PostgreSQL**: Robust relational database perfect for booking data with proper ACID transactions

### Similarities with Assessment

This project follows the same architecture pattern as the assessment:
- **Data Provider Service** (Flask/Faskes) - serves mock data from JSON
- **Main Application Service** (NestJS/Booking) - implements business logic
- **Database** (PostgreSQL) - persistent storage

### Key Differences

1. **Technology Stack**: Flask + NestJS (vs Flask + FastAPI in assessment)
2. **Domain**: Psychology/Healthcare (vs Customer Data in assessment)
3. **Complexity**: More complex business logic (booking workflow vs data ingestion)
4. **API Specs**: OpenAPI 3.0 specs provided for both services

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Microservices architecture with REST API communication
- ✅ Mock service pattern (similar to assessment)
- ✅ Enterprise-grade NestJS application
- ✅ TypeORM database operations
- ✅ Docker Compose orchestration
- ✅ Professional healthcare booking workflow

## 🚀 Deployment

### Render.com (Recommended)

**Automatic Deployment with Blueprint:**

1. Push code to GitHub
2. Sign up at https://render.com
3. Click **"New +"** → **"Blueprint"**
4. Select repository `achmadbaund/psikolog`
5. Render will auto-detect `render.yaml`
6. Click **"Apply Blueprint"**

**Services Deployed:**
- PostgreSQL Database (managed)
- Faskes Service (Flask)
- Booking Service (NestJS)

**Manual Deployment:**

See `render.yaml` for detailed configuration.

**Environment Variables on Render:**
```bash
# Database (auto-filled by Render)
DB_HOST=<from-postgres-service>
DB_PORT=5432
DB_USER=<from-postgres-service>
DB_PASSWORD=<from-postgres-service>
DB_NAME=psikolog_db

# Service URLs
FASKES_SERVICE_URL=https://psikolog-faskes-service.onrender.com
PORT=8003
NODE_ENV=production
```

### Railway.com

Railway deployment configuration available in `railway.json`.

### Local Tunneling (Ngrok)

For quick public access without deployment:

```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 8003
```

### Production Considerations

1. **Security**: Add JWT authentication to all endpoints
2. **Error Handling**: Implement comprehensive error handling
3. **Logging**: Add structured logging (Winston, Pino)
4. **Monitoring**: Add health checks and metrics
5. **Testing**: Add unit tests and integration tests
6. **API Documentation**: Generate full Swagger/OpenAPI docs
7. **Environment**: Use production-ready PostgreSQL (Render managed)
8. **CORS**: Configure allowed origins properly
9. **Rate Limiting**: Add rate limiting for API endpoints
10. **Backup**: Set up automated database backups

## ✅ Status

**Project Created**: 2024-03-10
**Version**: 1.0.0
**Status**: Development Ready

---

**Last Updated**: 2024-03-10
**Author**: Backend Assessment Practice
