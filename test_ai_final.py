"""Test AI endpoints with Sonnet 4.6 - one call each."""
import requests, json, time

BASE_URL = "https://tpgaxfppr9.execute-api.ap-south-1.amazonaws.com/dev"

print("Waiting 10s for Lambda env update...\n")
time.sleep(10)

# 1. Mentor Hint
print("=" * 50)
print("MENTOR HINT (Socratic)")
print("=" * 50)
resp = requests.post(f"{BASE_URL}/mentor/hint", json={
    "learner_id": "demo_learner_001",
    "concept_id": "data-structures",
    "question": "How do Python dictionaries work?",
    "hint_level": 1
}, timeout=90)
data = resp.json()
hint = data.get('hint', 'N/A')
is_real = hint != "I encountered an issue. Please try rephrasing your question."
print(f"Status: {resp.status_code}")
print(f"Hint: {hint[:300]}")
print(f"Result: {'AI WORKING' if is_real else 'STILL FALLBACK'}\n")

# 2. Episode Generation
print("=" * 50)
print("EPISODE GENERATION")
print("=" * 50)
resp = requests.get(f"{BASE_URL}/episodes/oop-basics?learner_id=demo_learner_001&concept_id=oop-basics", timeout=90)
data = resp.json()
content = data.get('content', '')
is_gen = 'temporarily unavailable' not in content
print(f"Status: {resp.status_code}")
print(f"Title: {data.get('title')}")
print(f"Format: {data.get('format')}")
print(f"Model: {data.get('model_used')}")
print(f"Content: {content[:200]}...")
print(f"Result: {'AI WORKING' if is_gen else 'STILL FALLBACK'}\n")

# 3. Bridge Sprint
print("=" * 50)
print("BRIDGE SPRINT")
print("=" * 50)
resp = requests.post(f"{BASE_URL}/bridge-sprint/generate", json={
    "learner_id": "demo_learner_001",
    "target_concept_id": "sorting"
}, timeout=90)
data = resp.json()
sprint = data.get('sprint', [])
is_ai = any('Quick Review' not in s.get('title', 'Quick Review') for s in sprint)
print(f"Status: {resp.status_code}")
print(f"Gaps: {[g.get('name') for g in data.get('gaps_found', [])]}")
print(f"Sprint items: {len(sprint)}")
if sprint:
    print(f"First: {sprint[0].get('title')}")
print(f"Result: {'AI WORKING' if is_ai else 'FALLBACK'}")
