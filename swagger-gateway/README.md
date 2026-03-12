# Swagger Gateway (via Kong)

Layanan Swagger UI yang menampilkan dokumentasi OpenAPI **Booking Service** dan **Faskes Service**. Diakses melalui Kong API Gateway.

## Akses

- **Via Kong:** http://localhost:8000/api/docs/
- **Langsung (dev):** http://localhost:8085 (jika dijalankan lewat compose)

Dropdown di atas Swagger UI untuk memilih **Booking Service** atau **Faskes Service**.

## Menjalankan

Service ini dijalankan bersama stack utama:

```bash
docker compose -f docker-compose-kafka.yml up -d --build swagger-gateway
```

Spec OpenAPI di-mount dari folder `../openapi/` (booking-service.yaml, faskes-service.yaml).

## Mendaftarkan ke Kong

Setelah Kong dan swagger-gateway jalan, daftarkan service dan route lewat Kong Admin API:

```bash
# Buat service
curl -s -X POST http://localhost:8001/services \
  --data name=swagger-gateway \
  --data url='http://swagger-gateway:80'

# Buat route (path /api/docs)
curl -s -X POST http://localhost:8001/services/swagger-gateway/routes \
  --data name=swagger-docs \
  --data 'paths[]=/api/docs' \
  --data strip_path=true
```

Lalu buka: **http://localhost:8000/api/docs/**

## Struktur

```
swagger-gateway/
├── Dockerfile      # nginx + static Swagger UI
├── nginx.conf      # serve index.html + /specs/*.yaml
├── index.html      # Swagger UI (multi-spec)
└── README.md
```

Specs diambil dari `openapi/` di root project (mount di compose).
