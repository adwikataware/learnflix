"""Test the Bedrock-powered endpoints after model ID fix."""
import requests, json, time

BASE_URL = "https://tpgaxfppr9.execute-api.ap-south-1.amazonaws.com/dev"

print("Waiting 10s for Lambda updates to propagate...\n")
time.sleep(10)

# Test 1: Mentor Hint (uses Haiku + Guardrail)
print("=" * 60)
print("TEST 1: Mentor Hint (Haiku + Guardrail)")
print("-" * 60)
resp = requests.post(f"{BASE_URL}/mentor/hint", json={
    "learner_id": "demo_learner_001",
    "concept_id": "data-structures",
    "question": "I don't understand how dictionaries work in Python. Can you help?",
    "hint_level": 1
}, timeout=90)
print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Hint: {data.get('hint', 'N/A')[:300]}")
print(f"Level: {data.get('hint_level')}, Direct: {data.get('is_direct_answer')}")
print(f"Language: {data.get('detected_language')} (conf: {data.get('language_confidence')})")
is_real = data.get('hint', '') != "I encountered an issue. Please try rephrasing your question."
print(f"[{'PASS - Real Bedrock response' if is_real else 'FAIL - Fallback response'}]")

# Test 2: Episode Generation (uses Sonnet for Code Lab / Haiku for others + RAG)
print("\n" + "=" * 60)
print("TEST 2: Episode Generation (Sonnet/Haiku + RAG)")
print("-" * 60)
resp = requests.get(f"{BASE_URL}/episodes/oop-basics?learner_id=demo_learner_001&concept_id=oop-basics", timeout=90)
print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Title: {data.get('title', 'N/A')}")
print(f"Format: {data.get('format', 'N/A')}")
print(f"Model: {data.get('model_used', 'N/A')}")
print(f"RAG: {data.get('rag_grounded', 'N/A')}")
content = data.get('content', '')
is_generated = 'temporarily unavailable' not in content
print(f"Content preview: {content[:200]}...")
print(f"[{'PASS - AI-generated content' if is_generated else 'FAIL - Fallback content'}]")

# Test 3: Bridge Sprint (uses Haiku + RAG)
print("\n" + "=" * 60)
print("TEST 3: Bridge Sprint (Haiku + RAG)")
print("-" * 60)
resp = requests.post(f"{BASE_URL}/bridge-sprint/generate", json={
    "learner_id": "demo_learner_001",
    "target_concept_id": "graphs"
}, timeout=90)
print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Sprint ID: {data.get('sprint_id', 'N/A')}")
print(f"Gaps: {[g.get('name') for g in data.get('gaps_found', [])]}")
print(f"RAG grounded: {data.get('rag_grounded')}")
sprint = data.get('sprint', [])
print(f"Sprint items: {len(sprint)}")
if sprint:
    print(f"First item: {json.dumps(sprint[0], indent=2)}")
# Check if sprint was AI-generated (has varied titles, not just "Quick Review: X")
is_ai_sprint = any('Quick Review' not in s.get('title', 'Quick Review') for s in sprint)
print(f"[{'PASS - AI-generated sprint' if is_ai_sprint else 'INFO - Using fallback sprint (Bedrock may have failed)'}]")

# Test 4: Hindi Mentor (Comprehend + Hinglish response)
print("\n" + "=" * 60)
print("TEST 4: Hindi Mentor Question (Comprehend language detection)")
print("-" * 60)
resp = requests.post(f"{BASE_URL}/mentor/hint", json={
    "learner_id": "demo_learner_001",
    "concept_id": "data-structures",
    "question": "Dictionary kya hoti hai Python mein? Mujhe samajh nahi aa raha",
    "hint_level": 2
}, timeout=90)
print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Hint: {data.get('hint', 'N/A')[:300]}")
print(f"Detected Language: {data.get('detected_language')}")
print(f"Language Confidence: {data.get('language_confidence')}")
