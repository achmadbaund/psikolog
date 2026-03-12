# Psychology Booking Pipeline

Pipeline booking konsultasi psikologi dengan **Kafka**, **CQRS** (MySQL), dan **Kong API Gateway**. Stack: Flask (Faskes), NestJS (Booking), Docker Compose.

## Arsitektur

```
                    ┌─────────────────┐
                    │  Kong Gateway   │  :8000 (proxy) :8001 (admin)
                    └────────┬────────┘
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│  Faskes Service  │  │ Booking Service │  │  Kafka + Zookeeper          │
│  Flask :8009    │  │ NestJS :8003    │  │  :9092 / :2181              │
│  (Kafka Producer)│  │ (Kafka Consumer)│  └─────────────────────────────┘
└────────┬────────┘  └────────┬────────┘              │
         │                    │                       │
         │  POST /booking      │  consume              │
         └───────────────────►│  booking-events       │
                              │  (CQRS Write → Event) │
                              ▼                       │
                    ┌─────────────────────┐           │
                    │  MySQL Write :3306  │◄──────────┘
                    │  MySQL Read  :3307  │  (event sync)
                    │  phpMyAdmin  :80    │
                    └─────────────────────┘
```

## Alur Data

- **Booking via Faskes**: `POST /booking` (faskes-service) → event ke Kafka → **booking-service** consume → CQRS Write DB → event handler sync ke Read DB.
- **Booking langsung**: `POST /bookings` (booking-service) → Command → Write DB → event → sync Read DB.
- **Baca booking**: `GET /bookings` → Query → **Read DB** (optimized for read).

## Services

| Service           | Port  | Peran                          |
|-------------------|-------|---------------------------------|
| Kong              | 8000  | API Gateway (proxy)             |
| Kong Admin        | 8001  | Kong Admin API                  |
| Booking Service   | 8003  | NestJS, CQRS + Kafka consumer   |
| Faskes Service    | 8009  | Flask, data faskes + Kafka producer |
| Kafka             | 9092  | Message broker                  |
| Kafka UI          | 8090  | kafbat UI                       |
| MySQL Write       | 3306  | CQRS write model                |
| MySQL Read        | 3307  | CQRS read model                 |
| phpMyAdmin        | 80    | DB admin                        |

## Quick Start

### Prerequisites

- Docker & Docker Compose v2+
- (Opsional) Node.js 18+, Python 3.10+ untuk development lokal

### Menjalankan stack penuh (Kafka + CQRS + Kong)

```bash
cd /path/to/psikolog
docker compose -f docker-compose-kafka.yml up -d --build
```

### Cek service

```bash
# Status container
docker compose -f docker-compose-kafka.yml ps

# Health
curl http://localhost:8009/health   # Faskes
curl http://localhost:8003/health  # Booking
```

### Dokumentasi terkait

- **[KONG-SETUP.md](KONG-SETUP.md)** – Konfigurasi Kong (routes, services)
- **[KAFKA-SETUP.md](KAFKA-SETUP.md)** – Kafka dan topic
- **[RESILIENCE-TESTING.md](RESILIENCE-TESTING.md)** – Pengujian ketahanan
- **[STRESS-TEST-GUIDE.md](STRESS-TEST-GUIDE.md)** – Panduan stress test

## API

### Faskes Service (Flask, :8009)

- `GET /health`
- `GET /faskes` – list faskes (pagination, filter `jenis_faskes`, `search`)
- `POST /faskes/nearby` – faskes terdekat (body: `latitude`, `longitude`, `radius`, `jenis_faskes`)
- `GET /faskes/{id}` – detail faskes + dokter
- `GET /faskes/{id}/dokter` – list dokter
- `GET /faskes/{id}/layanan` – list layanan
- `GET /dokter/{id}/jadwal` – jadwal praktik
- `POST /booking` – buat booking (publish ke Kafka)
- `POST /external/sync` – sync data eksternal (BPJS/Allo Bank)

### Booking Service (NestJS, :8003)

- `GET /health`
- `GET /bookings` – list booking (CQRS read, filter: `userId`, `psychologistId`, `status`, `startDate`, `endDate`, `search`)
- `POST /bookings` – buat booking (CQRS command)
- `GET /bookings/:id` – detail booking
- `PUT /bookings/:id` – update booking
- `DELETE /bookings/:id` – batalkan booking
- `POST /bookings/:id/join` – join sesi video

### OpenAPI & Swagger (via Kong)

- **Swagger UI (semua API):** http://localhost:8000/api/docs/ — setelah route Kong didaftarkan (lihat [swagger-gateway/README.md](swagger-gateway/README.md)).
- **Specs:** [openapi/booking-service.yaml](openapi/booking-service.yaml), [openapi/faskes-service.yaml](openapi/faskes-service.yaml).
- **Swagger UI langsung (Booking):** http://localhost:8003/api (jika diaktifkan di NestJS).

## Struktur Project

```
psikolog/
├── docker-compose-kafka.yml    # Stack: Kafka, Kong, MySQL CQRS, Faskes, Booking, Swagger
├── docker-compose-mysql.yml    # Hanya MySQL (opsional)
├── openapi/
│   ├── booking-service.yaml
│   └── faskes-service.yaml
├── swagger-gateway/            # Swagger UI via Kong (API docs)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── register-kong.sh        # Script daftar route ke Kong
│   └── README.md
├── faskes-service/             # Flask, Kafka producer
│   ├── app.py
│   ├── kafka_producer.py
│   ├── data/
│   │   ├── faskes.json
│   │   └── dokter.json
│   ├── Dockerfile
│   └── requirements.txt
├── booking-service/            # NestJS, CQRS + Kafka consumer
│   ├── src/
│   │   ├── booking/
│   │   │   ├── commands/       # CQRS commands & handlers
│   │   │   ├── queries/        # CQRS queries & handlers
│   │   │   ├── events/         # Domain events & handlers
│   │   │   ├── entities/read/  # Read model
│   │   │   ├── entities/write/ # Write model
│   │   │   ├── dto/
│   │   │   ├── booking.controller.ts
│   │   │   └── booking.service.ts
│   │   ├── kafka/              # Kafka consumer (booking-events)
│   │   ├── config/
│   │   ├── health/
│   │   ├── faskes-client/      # Client ke Faskes Service
│   │   └── resilience/         # Resilience (retry, circuit breaker)
│   ├── package.json
│   └── Dockerfile
├── postman/                    # Koleksi Postman
├── test-scripts/               # Script testing
├── KONG-SETUP.md
├── KAFKA-SETUP.md
├── RESILIENCE-TESTING.md
├── STRESS-TEST-GUIDE.md
└── README.md
```

## Testing singkat

```bash
# Faskes
curl "http://localhost:8009/faskes?page=0&size=2"
curl -X POST http://localhost:8009/faskes/nearby -H "Content-Type: application/json" \
  -d '{"latitude":-6.2088,"longitude":106.8456,"radius":5000}'

# Booking via Kafka (dari Faskes)
curl -X POST http://localhost:8009/booking -H "Content-Type: application/json" \
  -d '{"faskes_id":"550e8400-e29b-41d4-a716-446655440001","dokter_id":"550e8400-e29b-41d4-a716-446655440101","pasien_id":"user-1","jadwal":"2025-04-01T10:00:00Z"}'

# Booking langsung (Booking Service)
curl -X POST http://localhost:8003/bookings -H "Content-Type: application/json" \
  -d '{"psychologistId":"550e8400-e29b-41d4-a716-446655440101","scheduledAt":"2025-04-01T10:00:00Z"}'

# List booking
curl http://localhost:8003/bookings
```

## Environment (Booking Service, CQRS + Kafka)

Contoh variabel (bisa lewat `docker-compose-kafka.yml` atau `.env`):

- `CQRS_ENABLED=true`
- `WRITE_DB_*` / `READ_DB_*` – MySQL write & read
- `KAFKA_BROKERS`, `KAFKA_TOPIC`, `KAFKA_GROUP_ID`, `KAFKA_CONSUMER_ENABLED`

Jangan commit file `.env` atau `.env.cqrs` yang berisi kredensial.

## Deployment

- **Render**: lihat `render.yaml` dan [DEPLOYMENT.md](DEPLOYMENT.md).
- **Railway**: konfigurasi di [RAILWAY.md](RAILWAY.md).

Untuk production dengan Kafka/CQRS, sesuaikan env (DB, Kafka, Kong) di platform masing-masing.

## Status

- **Versi**: 1.x
- **Terakhir diperbarui**: 2025-03-12
- **Status**: Development (Kafka + CQRS + Kong terintegrasi)
