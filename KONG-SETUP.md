# Kong API Gateway & Kong Manager GUI - Setup Guide

## 🎯 Architecture Overview

```
                 ┌─────────────────┐
                 │   Kong Gateway  │
                 │   (Port 8000)   │
                 └────────┬────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
    ┌───────▼──────┐ ┌────▼─────┐ ┌────▼──────┐
    │ Booking Svc  │ │ Faskes   │ │  Future   │
    │   :8003      │ │ Svc:8009 │ │ Services  │
    └──────────────┘ └──────────┘ └───────────┘
```

## 🚀 Access Points

### Kong Gateway
- **Proxy (HTTP):** http://localhost:8000
- **Proxy (HTTPS):** https://localhost:8443
- **Admin API:** http://localhost:8001

### Kong Manager (Built-in GUI)
- **Dashboard (HTTP):** http://localhost:8002
- **Dashboard (HTTPS):** https://localhost:8445

### Services
- **Booking Service:** http://localhost:8003 (Direct) or via Kong: http://localhost:8000/api/bookings
- **Faskes Service:** http://localhost:8009 (Direct) or via Kong: http://localhost:8000/api/faskes

## 📝 Kong Manager GUI

Kong Manager adalah web UI built-in yang tersedia di Kong 3.8 (Community Edition). Tidak perlu setup tambahan!

1. **Buka Kong Manager:**
   ```
   http://localhost:8002
   ```

2. **Fitur yang Tersedia:**
   - **Services:** Manage backend services
   - **Routes:** Configure routing rules
   - **Plugins:** Enable & configure plugins (CORS, Rate Limiting, JWT, dll)
   - **Consumers:** Manage API consumers & credentials
   - **Certificates:** SSL/TLS certificates
   - **Snippets:** Custom Nginx configuration
   - **Upstreams:** Load balancing configuration

3. **Navigasi:**
   - Dashboard → Overview Kong instance
   - Services → Tambah/edit/delete services
   - Routes → Tambah/edit/delete routes
   - Plugins → Enable plugins per service/route/global

## 🔧 Configured Services & Routes

### Booking Service
- **Kong Service Name:** `booking-service`
- **Target:** http://booking-service:8003
- **Route:** `/api/bookings`
- **Test:**
  ```bash
  # Via Kong
  curl http://localhost:8000/api/bookings

  # Direct
  curl http://localhost:8003/bookings
  ```

### Faskes Service
- **Kong Service Name:** `faskes-service`
- **Target:** http://faskes-service:8009
- **Route:** `/api/faskes`
- **Test:**
  ```bash
  # Via Kong
  curl http://localhost:8000/api/faskes/health

  # Direct
  curl http://localhost:8009/health
  ```

### Swagger Gateway (API Docs)
- **Kong Service Name:** `swagger-gateway`
- **Target:** http://swagger-gateway:80
- **Route:** `/api/docs` (strip_path: true)
- **Akses:** http://localhost:8000/api/docs/

Daftarkan setelah Kong dan swagger-gateway jalan:
```bash
cd swagger-gateway && chmod +x register-kong.sh && ./register-kong.sh
```
Atau manual: lihat [swagger-gateway/README.md](swagger-gateway/README.md).

## 🔐 Common Kong Plugins (via Konga or Admin API)

### Enable CORS
```bash
curl -X POST http://localhost:8001/services/booking-service/plugins \
  --data name=cors \
  --data config.origins="*" \
  --data config.methods="GET,POST,PUT,DELETE,OPTIONS"
```

### Rate Limiting
```bash
curl -X POST http://localhost:8001/services/booking-service/plugins \
  --data name=rate-limiting \
  --data config.minute=20 \
  --data config.hour=100
```

### JWT Authentication
```bash
curl -X POST http://localhost:8001/services/booking-service/plugins \
  --data name=jwt
```

## 📊 Monitoring

### Check Kong Status
```bash
curl http://localhost:8001/
```

### List All Services
```bash
curl http://localhost:8001/services
```

### List All Routes
```bash
curl http://localhost:8001/routes
```

### View Service Details
```bash
curl http://localhost:8001/services/booking-service
```

## 🧪 Testing Commands

### Test Booking via Kong
```bash
# Health check
curl http://localhost:8000/api/bookings/health

# List bookings
curl http://localhost:8000/api/bookings

# Create booking
curl -X POST http://localhost:8000/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{
    "psychologistId": "550e8400-e29b-41d4-a716-446655440101",
    "scheduledAt": "2026-03-25T10:00:00Z",
    "notes": "Test via Kong Gateway"
  }'
```

### Test Faskes via Kong
```bash
# Health check
curl http://localhost:8000/api/faskes/health

# Create booking (via Kafka)
curl -X POST http://localhost:8000/api/faskes/booking \
  -H 'Content-Type: application/json' \
  -d '{
    "faskes_id": "550e8400-e29b-41d4-a716-446655440001",
    "dokter_id": "550e8400-e29b-41d4-a716-446655440101",
    "pasien_id": "test-user",
    "jadwal": "2026-03-26T14:00:00Z",
    "session_type": "VIDEO"
  }'
```

## 🛠️ Management Commands

### Restart Kong
```bash
docker restart kong
```

### Restart Konga
```bash
docker restart konga
```

### View Kong Logs
```bash
docker logs kong --tail 50 -f
```

### View Konga Logs
```bash
docker logs konga --tail 50
```

### Reset Kong (WARNING: Deletes all configuration)
```bash
docker-compose -f docker-compose-kafka.yml down -v
docker-compose -f docker-compose-kafka.yml up -d
```

## 📚 Additional Resources

- **Kong Documentation:** https://docs.konghq.com/gateway/
- **Konga GitHub:** https://github.com/pantsel/konga
- **Kong Admin API:** http://localhost:8001 (OpenAPI/Swagger available)

## 🔍 Troubleshooting

### Kong not routing properly
1. Check Kong is healthy: `docker ps | grep kong`
2. Check Kong logs: `docker logs kong`
3. Verify services are running: `docker ps | grep booking-service`
4. Test direct service access: `curl http://localhost:8003/health`

### Konga can't connect to Kong
1. Verify Kong is running: `curl http://localhost:8001`
2. Check Konga connection settings in Konga GUI
3. Use `http://kong:8001` as Kong Admin URL (not localhost)

### Database connection errors
1. Check PostgreSQL is running: `docker ps | grep kong-database`
2. Verify database was created: `docker exec kong-database psql -U kong -l`
3. Recreate Konga DB if needed:
   ```bash
   docker exec kong-database psql -U kong -c "DROP DATABASE konga_db;"
   docker exec kong-database psql -U kong -c "CREATE DATABASE konga_db;"
   docker restart konga
   ```
