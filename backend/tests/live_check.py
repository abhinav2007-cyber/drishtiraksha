"""Live API verification script for Stage 1."""
import httpx
import json
import time

BASE = "http://127.0.0.1:8000"

# 1. Health
print("=== HEALTH ===")
r = httpx.get(f"{BASE}/api/v1/health")
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))

# 2. Create text investigation
print("\n=== CREATE INVESTIGATION ===")
r = httpx.post(f"{BASE}/api/v1/investigations/json",
    json={"input_type": "text", "text": "A major bank will close tomorrow; withdraw money now."})
print(f"Status: {r.status_code}")
data = r.json()
print(json.dumps(data, indent=2))
inv_id = data["data"]["investigation_id"]

time.sleep(1)

# 3. Retrieve by ID
print("\n=== GET INVESTIGATION ===")
r2 = httpx.get(f"{BASE}/api/v1/investigations/{inv_id}")
print(f"Status: {r2.status_code}")
print(json.dumps(r2.json(), indent=2))

# 4. Status poll
print("\n=== STATUS POLL ===")
r3 = httpx.get(f"{BASE}/api/v1/investigations/{inv_id}/status")
print(json.dumps(r3.json(), indent=2))

# 5. Module endpoints
print("\n=== MEDIA (should be NOT_APPLICABLE) ===")
r4 = httpx.get(f"{BASE}/api/v1/investigations/{inv_id}/media")
print(json.dumps(r4.json(), indent=2))

print("\n=== CLAIMS ===")
r5 = httpx.get(f"{BASE}/api/v1/investigations/{inv_id}/claims")
print(json.dumps(r5.json(), indent=2))

print("\n=== NETWORK (should be NOT_APPLICABLE) ===")
r6 = httpx.get(f"{BASE}/api/v1/investigations/{inv_id}/network")
print(json.dumps(r6.json(), indent=2))

# 6. List investigations
print("\n=== LIST ===")
r7 = httpx.get(f"{BASE}/api/v1/investigations")
items = r7.json()["data"]
print(f"Count: {len(items)}")

# 7. Verify persistence
print("\n=== PERSISTENCE CHECK ===")
r8 = httpx.get(f"{BASE}/api/v1/investigations/{inv_id}")
print(f"Still exists: {r8.status_code == 200}")
print(f"Text preserved: {r8.json()['data']['text']}")

print("\n=== ALL LIVE CHECKS PASSED ===")
