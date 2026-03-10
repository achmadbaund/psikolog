# Faskes Service API Documentation

## Base URL
- **Local:** `http://localhost:8009`
- **Railway:** `https://faskes-service-production.up.railway.app` (contoh)

---

## 📋 Available Endpoints

### 1. **Health Check**
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "faskes-service",
  "timestamp": "2026-03-10T...",
  "external_sources": {
    "bpjs": {
      "status": "simulated",
      "last_sync": "2026-03-10T..."
    },
    "allo_bank": {
      "status": "simulated",
      "last_sync": "2026-03-10T..."
    }
  }
}
```

---

### 2. **List All Faskes**
```http
GET /faskes
```

**Query Parameters:**
- `jenis_faskes` (optional) - Filter by type (e.g., "RS", "KLINIK")
- `search` (optional) - Search by name or address
- `page` (optional) - Page number (default: 0)
- `size` (optional) - Items per page (default: 20)

**Examples:**
```bash
# Get all faskes
curl http://localhost:8009/faskes

# Filter by jenis_faskes
curl http://localhost:8009/faskes?jenis_faskes=RS

# Search by name
curl http://localhost:8009/faskes?search=rumah

# Pagination
curl http://localhost:8009/faskes?page=0&size=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nama_faskes": "RS Jiwa Proklamasi",
      "jenis_faskes": "RS",
      "alamat": "Jl. Proklamasi No. 123, Jakarta Pusat",
      "latitude": -6.1944,
      "longitude": 106.8229,
      "telepon": "021-1234-5678",
      "email": "info@rsjiwaproklamasi.co.id",
      "jam_operasional": {
        "senin": "08:00-20:00",
        "selasa": "08:00-20:00",
        "rabu": "08:00-20:00",
        "kamis": "08:00-20:00",
        "jumat": "08:00-20:00",
        "sabtu": "08:00-17:00",
        "minggu": "09:00-15:00"
      },
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

### 3. **Find Nearby Faskes**
```http
POST /faskes/nearby
```

**Request Body:**
```json
{
  "latitude": -6.1944,
  "longitude": 106.8229,
  "radius": 5000,
  "jenis_faskes": "RS"
}
```

**Parameters:**
- `latitude` (required) - User's latitude
- `longitude` (required) - User's longitude
- `radius` (optional) - Radius in meters (default: 5000)
- `jenis_faskes` (optional) - Filter by type

**Example:**
```bash
curl -X POST http://localhost:8009/faskes/nearby \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -6.1944,
    "longitude": 106.8229,
    "radius": 10000,
    "jenis_faskes": "RS"
  }'
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "nama_faskes": "RS Jiwa Proklamasi",
      "distance_km": 1.5,
      ...
    }
  ],
  "pagination": {...}
}
```

---

### 4. **Get Faskes Detail**
```http
GET /faskes/{faskes_id}
```

**Example:**
```bash
curl http://localhost:8009/faskes/550e8400-e29b-41d4-a716-446655440001
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "nama_faskes": "RS Jiwa Proklamasi",
    "dokter": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440101",
        "nama_dokter": "Dr. Sarah Wijaya, Sp.Ps",
        "spesialisasi": "Psikologi Klinis",
        ...
      }
    ],
    "layanan": [
      {
        "id": "layanan-001",
        "nama_layanan": "Konsultasi Psikologi Klinis",
        ...
      }
    ]
  }
}
```

---

### 5. **Get Dokter at Faskes**
```http
GET /faskes/{faskes_id}/dokter
```

**Example:**
```bash
curl http://localhost:8009/faskes/550e8400-e29b-41d4-a716-446655440001/dokter
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "faskes_id": "550e8400-e29b-41d4-a716-446655440001",
      "nama_dokter": "Dr. Sarah Wijaya, Sp.Ps",
      "spesialisasi": "Psikologi Klinis",
      "jadwal_praktik": [...],
      "kontak": "0812-3456-7890",
      "foto_dokter": "https://example.com/dokter/sarah-wijaya.jpg"
    }
  ]
}
```

---

### 6. **Get Layanan at Faskes**
```http
GET /faskes/{faskes_id}/layanan
```

**Example:**
```bash
curl http://localhost:8009/faskes/550e8400-e29b-41d4-a716-446655440001/layanan
```

**Response:**
```json
{
  "data": [
    {
      "id": "layanan-001",
      "faskes_id": "550e8400-e29b-41d4-a716-446655440001",
      "nama_layanan": "Konsultasi Psikologi Klinis",
      "kategori": "Konsultasi",
      "harga": 500000,
      ...
    }
  ]
}
```

---

### 7. **Get Dokter Schedule**
```http
GET /dokter/{dokter_id}/jadwal
```

**Example:**
```bash
curl http://localhost:8009/dokter/550e8400-e29b-41d4-a716-446655440101/jadwal
```

**Response:**
```json
{
  "data": {
    "dokter_id": "550e8400-e29b-41d4-a716-446655440101",
    "nama_dokter": "Dr. Sarah Wijaya, Sp.Ps",
    "jadwal_praktik": [
      {
        "hari": "SENIN",
        "jam_mulai": "09:00",
        "jam_selesai": "12:00",
        "kuota": 5
      },
      {
        "hari": "SENIN",
        "jam_mulai": "14:00",
        "jam_selesai": "17:00",
        "kuota": 5
      }
    ]
  }
}
```

---

### 8. **External Sync (BPJS/Allo Bank)**
```http
POST /external/sync
```

**Request Body:**
```json
{
  "source": "BPJS",
  "force_full_sync": true
}
```

**Example:**
```bash
curl -X POST http://localhost:8009/external/sync \
  -H "Content-Type: application/json" \
  -d '{
    "source": "BPJS",
    "force_full_sync": true
  }'
```

**Response:**
```json
{
  "status": "success",
  "source": "BPJS",
  "sync_time": "2026-03-10T...",
  "stats": {
    "faskes_created": 5,
    "faskes_updated": 0,
    "dokter_created": 5,
    "layanan_created": 15
  }
}
```

---

## 📊 Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/faskes` | List all faskes with pagination |
| POST | `/faskes/nearby` | Find nearby faskes by location |
| GET | `/faskes/{id}` | Get faskes detail with dokter & layanan |
| GET | `/faskes/{id}/dokter` | Get all dokter at faskes |
| GET | `/faskes/{id}/layanan` | Get all layanan at faskes |
| GET | `/dokter/{id}/jadwal` | Get dokter schedule |
| POST | `/external/sync` | Sync data from external APIs |

---

## 🔗 Untuk Booking Service

Booking service akan consume:
- `GET /faskes` - Get all faskes
- `GET /faskes/{id}/dokter` - Get dokter untuk ingestion

**FASKES_SERVICE_URL** harus di-set ke URL Railway Faskes Service!
