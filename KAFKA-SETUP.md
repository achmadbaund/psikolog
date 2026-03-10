# Kafka Integration Guide

## 🎯 Architecture with Kafka

```
User → Faskes Service (Producer) → Kafka → Booking Service (Consumer) → Database
```

---

## 🐳 Start with Kafka (Local Development)

### **STEP 1: Start All Services**

```bash
cd /Users/baundx/Downloads/psikolog
docker compose -f docker-compose-kafka.yml up -d --build
```

**Services yang akan running:**
- ✅ Zookeeper (port 2181)
- ✅ Kafka (port 9092, 29092)
- ✅ Kafka UI (port 8080) - Management UI
- ✅ PostgreSQL (port 5432)
- ✅ Faskes Service (port 8009) - Kafka Producer
- ✅ Booking Service (port 8003) - Kafka Consumer

---

### **STEP 2: Verify Kafka is Running**

**Check Kafka UI:**
```
http://localhost:8080
```

You should see:
- Topics: `booking-events` (auto-created)
- Brokers: 1 broker connected

**Check Kafka Logs:**
```bash
docker logs -f psikolog-kafka
```

---

### **STEP 3: Test Booking Flow**

#### **Create Booking via Faskes Service:**

```bash
curl -X POST http://localhost:8009/booking \
  -H "Content-Type: application/json" \
  -d '{
    "faskes_id": "550e8400-e29b-41d4-a716-446655440001",
    "dokter_id": "550e8400-e29b-41d4-a716-446655440101",
    "pasien_id": "user-001",
    "jadwal": "2026-03-15T10:00:00Z",
    "session_type": "VIDEO",
    "notes": "Konsultasi untuk kecemasan"
  }'
```

**Response (Immediate):**
```json
{
  "status": "success",
  "message": "Booking request received and queued for processing",
  "data": {
    "booking_id": "abc-123-def-456",
    "faskes_name": "RS Jiwa Proklamasi",
    "dokter_name": "Dr. Sarah Wijaya, Sp.Ps",
    "jadwal": "2026-03-15T10:00:00Z",
    "status": "PENDING",
    "estimated_processing_time": "1-2 minutes"
  }
}
```

#### **Check Kafka UI:**
```
http://localhost:8080
```

Click on topic `booking-events` → You'll see the booking message!

#### **Check Booking Service Logs:**
```bash
docker logs -f booking-service
```

You should see:
```
Received booking event: abc-123-def-456
Processing booking: abc-123-def-456
Booking created successfully: abc-123-def-456
```

#### **Verify Booking in Database:**
```bash
curl http://localhost:8003/bookings
```

---

## 🔍 Kafka Details

### **Kafka Topics:**

| Topic | Purpose | Partitions |
|-------|---------|------------|
| `booking-events` | Booking events from Faskes Service | 1 (auto-created) |

### **Kafka Configuration:**

**Kafka Broker:**
- Internal: `kafka:29092` (Docker network)
- External: `localhost:9092` (Host machine)

**Zookeeper:**
- Port: `2181`

**Kafka UI:**
- URL: `http://localhost:8080`
- Shows: Topics, Messages, Brokers, Consumers

---

## 🛠️ Troubleshooting

### **Problem: Kafka not starting**

**Check Zookeeper:**
```bash
docker logs psikolog-zookeeper
```

**Check Kafka:**
```bash
docker logs psikolog-kafka
```

**Restart:**
```bash
docker compose -f docker-compose-kafka.yml restart kafka
```

---

### **Problem: Faskes Service cannot connect to Kafka**

**Check environment variables:**
```bash
docker exec -it faskes-service env | grep KAFKA
```

Should show:
```
KAFKA_BROKERS=kafka:29092
KAFKA_TOPIC=booking-events
```

**Test connection from Faskes container:**
```bash
docker exec -it faskes-service sh
nc -zv kafka 29092
```

---

### **Problem: Booking Service not consuming messages**

**Check logs:**
```bash
docker logs -f booking-service
```

Look for:
```
Kafka Consumer connected
Subscribed to topic: booking-events
```

**Check consumer group:**
```bash
docker exec -it booking-service sh
# Inside container
kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic booking-events \
  --group booking-processor \
  --from-beginning
```

---

## 📊 Monitoring

### **Kafka UI Dashboard:**
```
http://localhost:8080
```

**What you can see:**
- Topics and messages
- Consumer groups
- Broker status
- Message throughput

### **Console Producer (Test):**
```bash
docker exec -it psikolog-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic booking-events
```

Type message (JSON):
```json
{"test": "message"}
```

### **Console Consumer (Test):**
```bash
docker exec -it psikolog-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic booking-events \
  --from-beginning
```

---

## 🚀 Production Deployment

For Railway production, you need:

### **Option A: Upstash Kafka (Recommended)**
1. Sign up: https://upstash.com
2. Create Kafka cluster
3. Get connection details
4. Update Railway env vars:
   ```
   KAFKA_BROKERS=<upstash-broker-url>
   KAFKA_USERNAME=<upstash-username>
   KAFKA_PASSWORD=<upstash-password>
   ```

### **Option B: Confluent Cloud**
1. Sign up: https://confluent.cloud
2. Create Kafka cluster
3. Get API keys
4. Update Railway env vars

---

## ✅ Summary

**Local Development:**
- Use `docker-compose-kafka.yml`
- Includes Kafka + Zookeeper + Kafka UI
- Full async booking flow

**Production (Railway):**
- Use managed Kafka (Upstash/Confluent)
- Update env vars with broker credentials
- Deploy services separately

**Key Benefits:**
✅ Async processing - Fast response to user
✅ Decoupled services - Faskes & Booking independent
✅ Scalable - Kafka handles message queuing
✅ Reliable - Messages persisted even if services down

---

**Ready to test?** Run: `docker compose -f docker-compose-kafka.yml up -d --build` 🚀
