# Resilience Testing Guide - Circuit Breaker Implementation

## 📚 Module 3: Infrastructure and Operational Microservices
### Bagian 3 & 4: Ketahanan Sistem (Resilience) & Praktik Resilience

---

## 🎯 Learning Objectives

After completing this module, you will be able to:
1. ✅ Understand resilience patterns in microservices architecture
2. ✅ Implement Circuit Breaker, Retry, and Timeout patterns
3. ✅ Test resilience mechanisms with stress testing
4. ✅ Observe circuit breaker state transitions (CLOSED → OPEN → HALF-OPEN → CLOSED)
5. ✅ Analyze fail-fast behavior and graceful degradation

---

## 🏗️ Architecture Overview

### Resilience Patterns Implemented

```
┌─────────────────────────────────────────────────────────────┐
│                    Booking Service                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         FaskesClientService (with Resilience)        │   │
│  │                                                         │   │
│  │  1️⃣ Timeout Policy    → 2 seconds                     │   │
│  │  2️⃣ Retry Policy     → 2 attempts, exponential backoff│   │
│  │  3️⃣ Circuit Breaker  → 3 consecutive failures        │   │
│  │  4️⃣ Fallback         → Default data                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│                    ┌──────────────┐                         │
│                    │ Faskes       │                         │
│                    │ Service      │                         │
│                    │ :8009        │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Circuit Breaker State Machine

```
                    ┌──────────────────────┐
                    │                      │
                    │    CLOSED            │
                    │ (Normal Operation)   │
                    │                      │
                    │ All requests pass    │
                    │ Count failures       │
                    │                      │
                    └──────────┬───────────┘
                               │
                               │ 3 consecutive failures
                               │
                               ▼
                    ┌──────────────────────┐
                    │                      │
                    │    OPEN              │
                    │ (Service Failing)    │
                    │                      │
                    │ Fail fast            │
                    │ No requests pass     │
                    │ Wait 10 seconds      │
                    │                      │
                    └──────────┬───────────┘
                               │
                               │ After 10 seconds
                               │
                               ▼
                    ┌──────────────────────┐
                    │                      │
                    │    HALF-OPEN         │
                    │ (Testing Recovery)   │
                    │                      │
                    │ Allow 1 test request │
                    │                      │
                    └──────────┬───────────┘
                               │
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              │ Success                         │ Failure
              │                                 │
              ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────┐
    │                  │              │                  │
    │   CLOSED         │              │   OPEN           │
    │   (Recovered)    │              │   (Still Failing) │
    │                  │              │                  │
    └──────────────────┘              └──────────────────┘
```

---

## 🔧 Implementation Details

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Timeout** | 2000ms (2 seconds) | Maximum wait time for response |
| **Retry** | 2 attempts | Retry on transient failures |
| **Backoff** | Exponential (1s - 5s) | Delay between retries |
| **Circuit Threshold** | 3 failures | Opens circuit after N consecutive failures |
| **Cooldown Period** | 10000ms (10s) | Time in OPEN before HALF-OPEN |
| **Fallback** | Enabled | Returns default data when service down |

### Libraries Used

```json
{
  "cockatiel": "^3.1.2",
  "@nestjs/axios": "^3.0.0"
}
```

---

## 🧪 Testing Procedures

### Prerequisites

1. **Start all services:**
   ```bash
   # Start infrastructure
   docker-compose -f docker-compose-kafka.yml up -d

   # Start Booking Service
   cd booking-service
   npm run start:dev

   # Start Faskes Service
   cd faskes-service
   npm run start:dev
   ```

2. **Import Postman Collection:**
   - File: `postman/Resilience-Test-Booking-Service.postman_collection.json`
   - Import into Postman

---

## 📋 Test Scenarios

### Scenario 1: Normal Operation (CLOSED State)

**Objective:** Verify circuit works correctly when service is healthy

**Steps:**
1. Ensure Faskes service is running: `curl http://localhost:8009/health`
2. Send test request via Postman or curl:
   ```bash
   curl http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001
   ```
3. Check logs for: `✅ Circuit Breaker is CLOSED`

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Response time < 2000ms
- ✅ Circuit remains CLOSED
- ✅ No fallback data returned

---

### Scenario 2: Failure Simulation (CLOSED → OPEN)

**Objective:** Observe circuit opening after consecutive failures

**Preparation:**
1. Stop Faskes service:
   ```bash
   docker stop faskes-service
   # OR press Ctrl+C in Faskes terminal
   ```

2. Verify Faskes is down:
   ```bash
   curl http://localhost:8009/health
   # Expected: Connection refused
   ```

**Testing:**
1. Open Postman Runner
2. Select "Stress Test - 20 Requests"
3. Configuration:
   - **Iterations:** 20
   - **Delay:** 500ms
4. Click "Run"

**Expected Results:**

| Request # | Expected Behavior | Response Time | Logs |
|-----------|-------------------|---------------|------|
| 1-3 | Tries to call Faskes, fails | ~2000ms (timeout) | `Error checking stock` |
| 3 | Circuit breaker OPENS | ~2000ms | `❌ Circuit Breaker is OPEN` |
| 4-20 | **FAIL FAST** | **< 50ms** | `Circuit breaker is OPEN! Using fallback` |

**Key Observations:**
- After 3 consecutive failures, circuit opens
- Requests 4-20 fail fast without waiting for timeout
- Response time drops from 2000ms to < 50ms (fail fast)
- Fallback data is returned

---

### Scenario 3: Recovery Test (HALF-OPEN → CLOSED)

**Objective:** Verify automatic recovery when service comes back

**Steps:**
1. Wait 10+ seconds after circuit opened (from Scenario 2)
2. Restart Faskes service:
   ```bash
   docker start faskes-service
   # OR run: cd faskes-service && npm run start:dev
   ```

3. Verify Faskes is up:
   ```bash
   curl http://localhost:8009/health
   # Expected: 200 OK
   ```

4. Send test request:
   ```bash
   curl http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001
   ```

**Expected Results:**

| State | Logs | Status |
|-------|------|--------|
| HALF-OPEN | `🔶 Circuit Breaker is HALF-OPEN` | Testing recovery |
| Success | `Stock check passed` | Request succeeded |
| CLOSED | `✅ Circuit Breaker is CLOSED` | Back to normal |

**If Faskes still down:**
- HALF-OPEN → OPEN (circuit opens again)

---

### Scenario 4: Stress Test with Postman Runner

**Objective:** Simulate high load to observe circuit behavior

**Configuration:**
```yaml
Iterations: 50
Delay: 200ms
Timeout: 5000ms
```

**Metrics to Observe:**
1. **Response Times:**
   - Normal requests: 50-500ms
   - Timeout requests: ~2000ms
   - Fail fast: < 50ms

2. **Circuit States:**
   - CLOSED → OPEN after 3 failures
   - OPEN → HALF-OPEN after 10s
   - HALF-OPEN → CLOSED on success

3. **Fallback Usage:**
   - Count how many times fallback is triggered
   - Verify fallback data is safe

---

## 📊 Monitoring & Observability

### Real-time Monitoring

**View Circuit Breaker Status:**
```bash
# Get current status
curl http://localhost:8003/resilience/circuit-breaker/status | jq

# Get configuration
curl http://localhost:8003/resilience/config | jq
```

**Monitor Logs:**
```bash
# Watch circuit breaker transitions
docker logs booking-service -f | grep -E "Circuit Breaker|🔶|✅|❌"
```

**Expected Log Patterns:**
```
[Nest] 12345 - ✅ Circuit Breaker is CLOSED
[Nest] 12345 - Checking stock for product prod-1...
[Nest] 12345 - Error checking stock: connect ECONNREFUSED
[Nest] 12345 - ❌ Circuit Breaker is OPEN
[Nest] 12345 - Circuit breaker is OPEN! Using fallback.
[Nest] 12345 - 🔶 Circuit Breaker is HALF-OPEN
[Nest] 12345 - ✅ Circuit Breaker is CLOSED
```

### Metrics Dashboard (TODO)

Create a Grafana dashboard showing:
- Circuit breaker state over time
- Request success rate (CLOSED vs OPEN)
- Response time percentiles (p50, p95, p99)
- Fallback usage count

---

## 🔍 Troubleshooting

### Issue: Circuit won't close

**Symptoms:**
- Circuit stays OPEN even after service is up
- All requests fail fast

**Solutions:**
1. Verify Faskes service is actually running:
   ```bash
   curl http://localhost:8009/health
   ```

2. Wait 10 seconds after service restart before testing

3. Send manual reset:
   ```bash
   curl -X POST http://localhost:8003/resilience/circuit-breaker/reset
   ```

4. Check logs for errors preventing successful requests

---

### Issue: Too many false positives

**Symptoms:**
- Circuit opens too frequently
- Legitimate requests being blocked

**Solutions:**
1. Increase circuit threshold (currently 3)
2. Increase timeout duration (currently 2000ms)
3. Check network latency between services

---

### Issue: Fallback returns wrong data

**Symptoms:**
- Default data breaking business logic
- Fallback data not safe for production

**Solutions:**
1. Review fallback implementation in `FaskesClientService`
2. Make fallback more conservative (fail fast instead)
3. Add alerts when fallback is used

---

## 📈 Performance Comparison

### Without Circuit Breaker

```
Request 1-50: All wait 2-3 seconds timeout
Total time: 50 × 3000ms = 150 seconds (2.5 minutes)
Resource usage: HIGH (threads blocked)
```

### With Circuit Breaker

```
Request 1-3: Wait 2 seconds timeout (6 seconds total)
Request 4-50: Fail fast < 50ms each (2.3 seconds total)
Total time: 8.3 seconds
Resource usage: LOW (no blocking)
Improvement: 18x faster
```

---

## 🎓 Key Takeaways

### Resilience Patterns

1. **Timeout:** Prevents infinite waiting, frees resources
2. **Retry:** Handles transient failures automatically
3. **Circuit Breaker:** Prevents cascading failures, enables fail fast
4. **Fallback:** Provides graceful degradation

### Best Practices

✅ **DO:**
- Set realistic timeout values based on SLA
- Use exponential backoff for retries
- Monitor circuit breaker state transitions
- Log all state changes for debugging
- Test failure scenarios regularly
- Use safe fallbacks that don't break functionality

❌ **DON'T:**
- Don't retry on permanent errors (4xx)
- Don't make non-idempotent operations retryable
- Don't set timeout too short (false positives)
- Don't ignore circuit breaker state
- Don't use fallbacks that hide critical failures
- Don't skip resilience testing

---

## 🚀 Next Steps

1. **Add Metrics:** Integrate Prometheus for circuit breaker metrics
2. **Add Alerts:** Configure alerts for circuit state changes
3. **Distributed Tracing:** Add Jaeger for end-to-end tracing
4. **Load Testing:** Use k6 or JMeter for more comprehensive testing
5. **Chaos Engineering:** Use Toxiproxy or Chaos Monkey for advanced testing

---

## 📚 Additional Resources

- [Cockatiel Documentation](https://nurrony.github.io/cockatiel/)
- [Circuit Breaker Pattern - Microsoft](https://docs.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Resilience4j - Java](https://resilience4j.readme.io/)
- [NestJS Microservices](https://docs.nestjs.com/microservices)

---

## 📝 Exercise Checklist

- [ ] Install cockatiel and @nestjs/axios
- [ ] Create FaskesClientService with resilience patterns
- [ ] Add circuit breaker state monitoring
- [ ] Create ResilienceController with test endpoints
- [ ] Import Postman collection
- [ ] Test Scenario 1: Normal operation
- [ ] Test Scenario 2: Failure simulation
- [ ] Test Scenario 3: Recovery test
- [ ] Test Scenario 4: Stress test
- [ ] Document results and observations
- [ ] Update configuration based on findings

---

**Created:** 2026-03-12
**Module:** Modul 3 - Infrastruktur dan Operasional Microservices
**Bagian:** 3 (Ketahanan Sistem) & 4 (Praktik Resilience)
