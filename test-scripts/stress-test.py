#!/usr/bin/env python3
"""
Stress Test untuk Circuit Breaker
Penggunaan: python3 stress-test.py
"""

import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8003"
FASKES_ID = "550e8400-e29b-41d4-a716-446655440001"
TOTAL_REQUESTS = 20
DELAY_MS = 500

# Colors for terminal
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"{text:^60}")
    print(f"{'='*60}{Colors.END}\n")

def get_circuit_status():
    """Get current circuit breaker status"""
    try:
        response = requests.get(f"{BASE_URL}/resilience/circuit-breaker/status")
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def test_circuit_breaker():
    """Run stress test"""
    print_header("🔥 STRESS TEST - CIRCUIT BREAKER 🔥")

    # Initial status
    print(f"{Colors.BOLD}1. Initial Circuit Breaker Status:{Colors.END}")
    status = get_circuit_status()
    print(json.dumps(status, indent=2))

    # Check Faskes service
    print(f"\n{Colors.BOLD}2. Checking Faskes Service...{Colors.END}")
    try:
        response = requests.get("http://localhost:8009/health", timeout=2)
        print(f"   {Colors.GREEN}✅ Faskes Service: RUNNING{Colors.END}")
        faskes_up = True
    except:
        print(f"   {Colors.RED}❌ Faskes Service: DOWN{Colors.END}")
        faskes_up = False

    # Stress test
    print(f"\n{Colors.BOLD}3. Running {TOTAL_REQUESTS} Requests...{Colors.END}")
    print(f"{Colors.BLUE}{'Req':<5} {'State':<12} {'Time':<10} {'Status':<20}{Colors.END}")
    print("-" * 60)

    results = {
        "CLOSED": 0,
        "OPEN": 0,
        "HALF_OPEN": 0,
        "fail_fast": 0,
        "normal": 0
    }

    for i in range(1, TOTAL_REQUESTS + 1):
        start = time.time() * 1000  # milliseconds

        try:
            response = requests.get(
                f"{BASE_URL}/resilience/circuit-breaker/test/{FASKES_ID}",
                timeout=5
            )
            data = response.json()

            end = time.time() * 1000
            duration = int(end - start)

            state = data.get('circuitState', 'UNKNOWN')
            results[state] = results.get(state, 0) + 1

            # Check if fail fast (response < 100ms)
            if duration < 100:
                results['fail_fast'] += 1
                status_icon = f"{Colors.YELLOW}⚡ FAIL FAST{Colors.END}"
            else:
                results['normal'] += 1
                status_icon = f"{Colors.GREEN}✅ NORMAL{Colors.END}"

            # Color by state
            if state == "CLOSED":
                state_colored = f"{Colors.GREEN}{state}{Colors.END}"
            elif state == "OPEN":
                state_colored = f"{Colors.RED}{state}{Colors.END}"
            elif state == "HALF_OPEN":
                state_colored = f"{Colors.YELLOW}{state}{Colors.END}"
            else:
                state_colored = state

            print(f"{i:<5} {state_colored:<12} {duration:<10}ms {status_icon}")

        except Exception as e:
            print(f"{i:<5} ERROR: {str(e)}")

        # Delay between requests
        time.sleep(DELAY_MS / 1000)

    # Summary
    print_header("📊 TEST RESULTS")

    print(f"{Colors.BOLD}Request Distribution:{Colors.END}")
    print(f"   CLOSED:     {Colors.GREEN}{results['CLOSED']}{Colors.END}")
    print(f"   OPEN:       {Colors.RED}{results['OPEN']}{Colors.END}")
    print(f"   HALF_OPEN:  {Colors.YELLOW}{results['HALF_OPEN']}{Colors.END}")

    print(f"\n{Colors.BOLD}Performance:{Colors.END}")
    print(f"   Normal Requests:    {Colors.GREEN}{results['normal']}{Colors.END}")
    print(f"   Fail Fast Requests: {Colors.YELLOW}{results['fail_fast']}{Colors.END}")

    # Calculate improvement
    if results['fail_fast'] > 0 and results['normal'] > 0:
        improvement = (results['fail_fast'] * 2000) / (results['normal'] * 100)
        print(f"\n   {Colors.BLUE}⚡ Performance Improvement: ~{improvement:.1f}x faster{Colors.END}")

    # Final status
    print(f"\n{Colors.BOLD}Final Circuit Breaker Status:{Colors.END}")
    final_status = get_circuit_status()
    print(json.dumps(final_status, indent=2))

    # Recent logs
    print(f"\n{Colors.BOLD}Recent Circuit Breaker Logs:{Colors.END}")
    import subprocess
    logs = subprocess.run(
        ["docker", "logs", "booking-service", "--tail", "30"],
        capture_output=True,
        text=True
    )
    for line in logs.stdout.split('\n'):
        if any(word in line for word in ['Circuit', '🔶', '✅', '❌', '⚡']):
            print(f"   {line}")

if __name__ == "__main__":
    try:
        test_circuit_breaker()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Test interrupted by user{Colors.END}")
    except Exception as e:
        print(f"\n\n{Colors.RED}❌ Error: {e}{Colors.END}")
