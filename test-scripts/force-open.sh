#!/bin/bash

echo "=========================================="
echo "  🔥 FORCE CIRCUIT BREAKER OPEN 🔥"
echo "=========================================="
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS version
    get_time_ms() {
        python3 -c "import time; print(int(time.time() * 1000))"
    }
else
    # Linux version
    get_time_ms() {
        date +%s%3N
    }
fi

# Step 1: Stop Faskes
echo "1️⃣  Stopping Faskes Service..."
docker stop faskes-service > /dev/null 2>&1
sleep 2

# Verify Faskes is really stopped
if docker ps | grep -q faskes-service; then
    echo "   ❌ ERROR: Faskes service still running!"
    echo "   Try manually: docker stop faskes-service"
    exit 1
fi

echo "   ✅ Faskes Service: STOPPED"
echo ""

# Step 2: Reset Circuit
echo "2️⃣  Resetting Circuit Breaker..."
curl -s -X POST http://localhost:8003/resilience/circuit-breaker/reset > /dev/null 2>&1
sleep 1
echo "   ✅ Circuit Breaker: RESET to CLOSED"
echo ""

# Step 3: Send 3 requests to trigger OPEN
echo "3️⃣  Sending 3 requests to trigger OPEN..."
echo ""

CIRCUIT_OPEN=false

for i in {1..3}; do
    echo -n "   Request $i: "

    START=$(get_time_ms)

    # Send request and capture both body and HTTP code
    RESPONSE=$(curl -s -w "\n---HTTP-%{http_code}---" http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001 2>&1)

    END=$(get_time_ms)
    DURATION=$((END - START))

    # Extract HTTP code and body
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP-" | sed 's/HTTP-//' | sed 's/---//')
    BODY=$(echo "$RESPONSE" | grep -v "HTTP-")

    # Get state from response
    STATE=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('circuitState', 'UNKNOWN'))" 2>/dev/null || echo "ERROR")

    if [ "$STATE" = "OPEN" ]; then
        echo "🔥 CIRCUIT OPEN! (Time: ${DURATION}ms)"
        CIRCUIT_OPEN=true
        break
    else
        echo "⚠️  Timeout (Time: ${DURATION}ms) - State: $STATE"
    fi

    sleep 1
done

echo ""
echo "4️⃣  Verifying Circuit State..."
sleep 1

STATUS=$(curl -s http://localhost:8003/resilience/circuit-breaker/status)
STATE=$(echo "$STATUS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('state', 'UNKNOWN'))" 2>/dev/null || echo "ERROR")

if [ "$STATE" = "OPEN" ]; then
    echo "   ✅ Circuit Breaker: OPEN 🔥"
    echo ""
    echo "5️⃣  Testing Fail Fast (Next 3 requests)..."
    echo ""

    for i in {1..3}; do
        echo -n "   Request $i (fail fast): "

        START=$(get_time_ms)
        curl -s http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001 > /dev/null 2>&1
        END=$(get_time_ms)
        DURATION=$((END - START))

        if [ $DURATION -lt 100 ]; then
            echo "⚡ FAIL FAST! (${DURATION}ms)"
        else
            echo "⚠️  Not fail fast (${DURATION}ms)"
        fi
    done

else
    echo "   ❌ Circuit Breaker: $STATE (not OPEN yet)"
    echo ""
    echo "   Possible reasons:"
    echo "   1. Faskes service is still running"
    echo "   2. Circuit breaker threshold not reached"
    echo "   3. Network delay causing slow responses"
fi

echo ""
echo "=========================================="
echo "6️⃣  Current Status:"
echo "=========================================="
curl -s http://localhost:8003/resilience/circuit-breaker/status | python3 -m json.tool

echo ""
echo "=========================================="
echo "7️⃣  Recent Logs:"
echo "=========================================="
docker logs booking-service --tail 30 | grep -E "Circuit|🔶|✅|❌|⚡" | tail -15

echo ""
if [ "$CIRCUIT_OPEN" = true ]; then
    echo "=========================================="
    echo "✅ DONE! Circuit Breaker is OPEN 🔥"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Wait 10 seconds → Circuit akan ke HALF-OPEN"
    echo "2. Start Faskes service → Circuit akan ke CLOSED"
    echo ""
    echo "Commands:"
    echo "  docker start faskes-service"
    echo "  sleep 10"
    echo "  curl http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001"
    echo "=========================================="
else
    echo "=========================================="
    echo "❌ Circuit Breaker NOT OPEN"
    echo "=========================================="
    echo ""
    echo "Troubleshooting:"
    echo "1. Check Faskes is really stopped:"
    echo "   docker ps | grep faskes"
    echo ""
    echo "2. If still running, stop it:"
    echo "   docker stop faskes-service"
    echo ""
    echo "3. Try again: ./force-open.sh"
    echo "=========================================="
fi
