#!/bin/sh
# Daftarkan Swagger Gateway ke Kong (jalan setelah Kong & swagger-gateway up)
# Usage: ./register-kong.sh [KONG_ADMIN_URL]
# Default KONG_ADMIN_URL=http://localhost:8001

KONG_ADMIN="${1:-http://localhost:8001}"

echo "Registering swagger-gateway with Kong at $KONG_ADMIN ..."

# Service
curl -s -X POST "$KONG_ADMIN/services" \
  --data name=swagger-gateway \
  --data url='http://swagger-gateway:80' && echo " [service OK]" || echo " [service FAIL or already exists]"

# Route
curl -s -X POST "$KONG_ADMIN/services/swagger-gateway/routes" \
  --data name=swagger-docs \
  --data 'paths[]=/api/docs' \
  --data strip_path=true && echo " [route OK]" || echo " [route FAIL or already exists]"

echo "Done. Open: http://localhost:8000/api/docs/"
