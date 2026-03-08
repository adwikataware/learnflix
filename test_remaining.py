import requests, json

BASE_URL = "https://tpgaxfppr9.execute-api.ap-south-1.amazonaws.com/dev"

# Test constellation with learner_id
print("Testing Constellation with learner_id...")
resp = requests.get(f"{BASE_URL}/constellation?learner_id=demo_learner_001", timeout=90)
print(f"Status: {resp.status_code}")
data = resp.json()
resp_str = json.dumps(data, indent=2)
if len(resp_str) > 800:
    print(f"Response (truncated): {resp_str[:800]}...")
else:
    print(f"Response: {resp_str}")

# Test mentor with a Hindi question (to test Comprehend)
print("\n\nTesting Mentor with Hindi question...")
resp = requests.post(f"{BASE_URL}/mentor/hint", json={
    "learner_id": "demo_learner_001",
    "concept_id": "data-structures",
    "question": "Mujhe dictionary samajh nahi aa rahi, kaise kaam karti hai Python mein?",
    "hint_level": 1
}, timeout=90)
print(f"Status: {resp.status_code}")
print(f"Response: {json.dumps(resp.json(), indent=2)}")
