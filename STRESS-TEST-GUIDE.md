# 🧪 Stress Testing Guide - Circuit Breaker

## 📋 Cara Melakukan Stress Test (20x Request)

Pilih salah satu dari 4 metode di bawah ini:

---

## 🌐 **METODE 1: Browser GUI (Paling Mudah)**

**Cara:**
1. Buka file ini di browser:
   ```bash
   open /Users/baundx/Downloads/psikolog/test-scripts/stress-test-browser.html
   ```

2. Klik **"🚀 Start Stress Test"**

3. Atur:
   - Total Requests: **20**
   - Delay: **500ms**

4. Tunggu hasilnya!

**Kelebihan:**
- ✅ Visual dan interaktif
- ✅ Real-time progress bar
- ✅ Bisa stop kapan saja
- ✅ Bisa single request untuk testing

---

## 💻 **METODE 2: Bash Script (Cepat)**

**Cara:**
```bash
cd /Users/baundx/Downloads/psikolog/test-scripts
./stress-test.sh
```

**Output:**
```
==========================================
  STRESS TEST - CIRCUIT BREAKER
==========================================

1. Cek Faskes Service Status:
   ✅ Faskes Service: RUNNING

2. Initial Circuit Breaker Status:
{
    "state": "CLOSED",
    "failureCount": 0,
    ...
}

3. STRESS TEST - 20 REQUESTS
Request 1/20: ⚡ FAIL FAST | State: OPEN | Time: 15ms
Request 2/20: ⚡ FAIL FAST | State: OPEN | Time: 12ms
...
```

**Kelebihan:**
- ✅ Tidak perlu install apa-apa
- ✅ Otomatis cek status
- ✅ Ringkasan hasil di akhir

---

## 🐍 **METODE 3: Python Script (Detail)**

**Cara:**
```bash
cd /Users/baundx/Downloads/psikolog/test-scripts
python3 stress-test.py
```

**Output:**
```
============================================================
              🔥 STRESS TEST - CIRCUIT BREAKER 🔥
============================================================

1. Initial Circuit Breaker Status:
{
  "state": "CLOSED",
  ...
}

2. Checking Faskes Service...
   ✅ Faskes Service: RUNNING

3. Running 20 Requests...
Req   State         Time       Status
------------------------------------------------------------
1     CLOSED        245ms      ✅ NORMAL
2     CLOSED        189ms      ✅ NORMAL
3     OPEN          15ms       ⚡ FAIL FAST
...
```

**Kelebihan:**
- ✅ Color-coded output
- ✅ Statistik lengkap
- ✅ Performance metrics

---

## 📮 **METODE 4: Postman Collection (Recommended)**

**Cara:**
1. Buka Postman
2. Import file:
   ```
   /Users/baundx/Downloads/psikolog/postman/Resilience-Test-Booking-Service.postman_collection.json
   ```
3. Pilih folder: **"2. Stress Test - Circuit Breaker Transition"**
4. Pilih request: **"Stress Test - 20 Requests"**
5. Klik tombol **Run** (kanan atas)
6. Atur:
   - Iterations: **20**
   - Delay: **500ms**
7. Klik **Run Resilience Test**

**Kelebihan:**
- ✅ GUI yang bagus
- ✅ Bisa save hasil
- ✅ Bisa export report
- ✅ Cocok untuk dokumentasi

---

## 🎯 **Skenario Testing Lengkap**

### **Scenario 1: Normal Operation (Faskes UP)**
```bash
# Pastikan Faskes jalan
docker-compose -f docker-compose-kafka.yml start faskes-service

# Jalankan stress test
python3 stress-test.py
# Buka browser: stress-test-browser.html
```

**Expected:**
- Semua 20 request: SUCCESS
- State: CLOSED
- Response time: 100-500ms
- Fail fast: 0

---

### **Scenario 2: Failure Simulation (Faskes DOWN)**
```bash
# Stop Faskes
docker-compose -f docker-compose-kafka.yml stop faskes-service

# Reset circuit breaker dulu
curl -X POST http://localhost:8003/resilience/circuit-breaker/reset

# Jalankan stress test
python3 stress-test.py
```

**Expected:**
- Request 1-3: Timeout (~2000ms) → State: CLOSED
- Request 3: **Circuit OPENS**
- Request 4-20: **FAIL FAST** (< 50ms) → State: OPEN

---

### **Scenario 3: Recovery Test**
```bash
# Setelah circuit OPEN, tunggu 10s
sleep 10

# Start Faskes lagi
docker-compose -f docker-compose-kafka.yml start faskes-service

# Jalankan stress test lagi
python3 stress-test.py
```

**Expected:**
- Request 1: HALF_OPEN (testing recovery)
- Request 2-3: HALF_OPEN → CLOSED
- Setelah 3 successes: **CLOSED** (normal again)

---

## 📊 **Memahami Hasil**

| Metric | Arti |
|--------|------|
| **Fail Fast Count** | Berapa request yang cepat (< 100ms) karena circuit OPEN |
| **Normal Requests** | Request yang normal (100-2000ms) |
| **State CLOSED** | Circuit normal, semua request diproses |
| **State OPEN** | Circuit terbuka, request di-block (fail fast) |
| **State HALF_OPEN** | Circuit testing recovery |

---

## 🔍 **Troubleshooting**

### **Problem: Circuit tidak mau OPEN**
**Solution:**
```bash
# Reset dulu
curl -X POST http://localhost:8003/resilience/circuit-breaker/reset

# Pastikan Faskes benar-benar mati
docker stop faskes-service

# Test manual 1 request
curl http://localhost:8003/resilience/circuit-breaker/test/550e8400-e29b-41d4-a716-446655440001
```

### **Problem: Semua request gagal**
**Solution:**
```bash
# Cek apakah booking service jalan
docker ps | grep booking-service

# Cek logs
docker logs booking-service --tail 50

# Restart booking service
docker-compose -f docker-compose-kafka.yml restart booking-service
```

### **Problem: Faskes service tidak mau start**
**Solution:**
```bash
# Cek port 8009
lsof -i :8009

# Kill process yang pakai port 8009
kill -9 $(lsof -t -i:8009)

# Start ulang
docker-compose -f docker-compose-kafka.yml start faskes-service
```

---

## 📁 **File yang Tersedia**

```
test-scripts/
├── stress-test.sh              # Bash script
├── stress-test.py              # Python script
└── stress-test-browser.html    # Browser GUI

postman/
└── Resilience-Test-Booking-Service.postman_collection.json
```

---

## 🎓 **Tips**

1. **Mulai dengan browser GUI** - Paling mudah untuk visualisasi
2. **Gunakan Python script** untuk hasil yang detail dan color-coded
3. **Gunakan Postman** untuk dokumentasi dan report
4. **Gunakan Bash script** untuk quick testing tanpa dependencies

**Happy Testing! 🚀**
