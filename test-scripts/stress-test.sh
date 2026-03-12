#!/bin/bash

# Stress Test Script untuk Circuit Breaker
# Penggunaan: ./stress-test.sh

echo "=========================================="
echo "  STRESS TEST - CIRCUIT BREAKER        "
echo "=========================================="
echo ""

# Cek apakah faskes service running
echo "1. Cek Faskes Service Status:"
curl -s http://localhost:8009/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Faskes Service: RUNNING"
    FASKES_STATUS="UP"
else
    echo "   ❌ Faskes Service: DOWN"
    FASKES_STATUS="DOWN"
fi
echo ""

# Get circuit breaker initial status
echo "2. Initial Circuit Breaker Status:"
curl -s http://localhost:8003/resilience/circuit-breaker/status | python3 -m json.tool
echo ""

# Stress test - 20 requests
echo "=========================================="
echo "3. STRESS TEST - 20 REQUESTS"
echo "=========================================="
echo ""

TOTAL_REQUESTS=20
FAIL_FAST_COUNT=0
NORMAL_REQUEST_COUNT=0

for i in $(seq 1 $TOTAL_REQUESTS); do
    echo -n "Request $i/$TOTAL_REQUESTS: "

    # Measure response time
    START=$(date +%s%3N)
    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001)
    END=$(date +%s%3N)

    DURATION=$((END - START))
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    # Parse response
    STATE=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('circuitState', 'UNKNOWN'))" 2>/dev/null || echo "ERROR")

    # Check if fail fast (response time < 100ms)
    if [ $DURATION -lt 100 ]; then
        echo "⚡ FAIL FAST | State: $STATE | Time: ${DURATION}ms"
        FAIL_FAST_COUNT=$((FAIL_FAST_COUNT + 1))
    else
        echo "✅ NORMAL | State: $STATE | Time: ${DURATION}ms"
        NORMAL_REQUEST_COUNT=$((NORMAL_REQUEST_COUNT + 1))
    fi

    # Delay 500ms between requests
    sleep 0.5
done

echo ""
echo "=========================================="
echo "4. SUMMARY"
echo "=========================================="
echo "Total Requests:     $TOTAL_REQUESTS"
echo "Normal Requests:    $NORMAL_REQUEST_COUNT"
echo "Fail Fast Requests: $FAIL_FAST_COUNT"
echo ""

# Final circuit breaker status
echo "5. Final Circuit Breaker Status:"
curl -s http://localhost:8003/resilience/circuit-breaker/status | python3 -m json.tool
echo ""

echo "=========================================="
echo "6. RECENT LOGS (State Transitions)"
echo "=========================================="
docker logs booking-service --tail 30 | grep -E "Circuit|🔶|✅|❌|⚡" | tail -10
