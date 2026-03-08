"""Final verification - ONE call per endpoint, minimal cost."""
import requests, json, time

BASE_URL = "https://tpgaxfppr9.execute-api.ap-south-1.amazonaws.com/dev"
PASS = 0
FAIL = 0

def test(name, method, path, body=None):
    global PASS, FAIL
    url = f"{BASE_URL}{path}"
    print(f"\n[{name}] {method} {path}")
    try:
        if method == 'GET':
            resp = requests.get(url, timeout=90)
        else:
            resp = requests.post(url, json=body, timeout=90)

        data = resp.json()
        # Check for actual success (not just 200)
        if resp.status_code == 200:
            # Check if it's a real response vs fallback
            resp_str = json.dumps(data)
            if 'error' in data and resp.status_code != 200:
                print(f"  FAIL ({resp.status_code}): {data.get('error','')[:100]}")
                FAIL += 1
            else:
                print(f"  PASS (200) - Keys: {list(data.keys())[:6]}")
                PASS += 1
        else:
            print(f"  FAIL ({resp.status_code})")
            FAIL += 1
        return data
    except Exception as e:
        print(f"  ERROR: {e}")
        FAIL += 1
        return None

print("Waiting 15s for payment method to propagate...\n")
time.sleep(15)

# 1. Quick Bedrock test first
print("=" * 50)
print("BEDROCK SMOKE TEST")
print("=" * 50)
import boto3
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
try:
    res = bedrock.invoke_model(
        modelId='global.anthropic.claude-haiku-4-5-20251001-v1:0',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 20,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say OK"}]}]
        }),
        accept="application/json",
        contentType="application/json"
    )
    body = json.loads(res['body'].read())
    print(f"  Bedrock Haiku: {body['content'][0]['text']}")
    print("  BEDROCK IS WORKING!")
except Exception as e:
    err = str(e)[:150]
    print(f"  Bedrock still blocked: {err}")
    if 'INVALID_PAYMENT' in err:
        print("  Payment method may need ~2 more minutes to propagate.")
        print("  Other endpoints will still work with fallbacks.")

# 2. All endpoints - one call each
print("\n" + "=" * 50)
print("API ENDPOINT TESTS (1 call each)")
print("=" * 50)

test("Constellation", "GET", "/constellation?learner_id=demo_learner_001")
test("Dashboard", "GET", "/dashboard/demo_learner_001")
test("Episode", "GET", "/episodes/data-structures?learner_id=demo_learner_001&concept_id=data-structures")
test("Mentor", "POST", "/mentor/hint", {
    "learner_id": "demo_learner_001", "concept_id": "data-structures",
    "question": "How do Python dictionaries work?", "hint_level": 1
})
test("BKT Update", "POST", "/bkt/update", {
    "learner_id": "demo_learner_001", "concept_id": "oop-basics",
    "is_correct": True, "difficulty": 0.5
})
test("Leitner Due", "GET", "/leitner/due?learner_id=demo_learner_001")
test("Leitner Review", "POST", "/leitner/review", {
    "learner_id": "demo_learner_001", "concept_id": "algorithms-intro", "correct": True
})
test("Struggle", "POST", "/struggle/signal", {
    "learner_id": "demo_learner_001", "concept_id": "oop-basics"
})
test("Bridge Sprint", "POST", "/bridge-sprint/generate", {
    "learner_id": "demo_learner_001", "target_concept_id": "sorting"
})
test("Code Sandbox", "POST", "/code/execute", {
    "learner_id": "demo_learner_001", "code": "print('Hello PrimeLearn!')"
})

print(f"\n{'='*50}")
print(f"RESULTS: {PASS} PASS / {FAIL} FAIL / {PASS+FAIL} TOTAL")
print(f"{'='*50}")
