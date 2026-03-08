"""
End-to-end API test for all PrimeLearn endpoints.
Tests against the live API Gateway.
"""
import requests
import json
import time

BASE_URL = "https://tpgaxfppr9.execute-api.ap-south-1.amazonaws.com/dev"
LEARNER_ID = "demo_learner_001"

def test(name, method, path, body=None, expected_status=200):
    url = f"{BASE_URL}{path}"
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"  {method} {path}")
    if body:
        print(f"  Body: {json.dumps(body)[:200]}")
    print("-"*60)

    try:
        if method == 'GET':
            resp = requests.get(url, timeout=90)
        elif method == 'POST':
            resp = requests.post(url, json=body, timeout=90)
        elif method == 'PUT':
            resp = requests.put(url, json=body, timeout=90)
        else:
            print(f"  [ERROR] Unknown method: {method}")
            return None

        print(f"  Status: {resp.status_code}")
        try:
            data = resp.json()
            # Print response (truncated)
            resp_str = json.dumps(data, indent=2)
            if len(resp_str) > 500:
                print(f"  Response (truncated): {resp_str[:500]}...")
            else:
                print(f"  Response: {resp_str}")
        except:
            print(f"  Response (raw): {resp.text[:300]}")
            data = None

        if resp.status_code == expected_status:
            print(f"  [PASS]")
        else:
            print(f"  [FAIL] Expected {expected_status}, got {resp.status_code}")

        return data
    except Exception as e:
        print(f"  [ERROR] {e}")
        return None


def main():
    print("=" * 60)
    print("  PrimeLearn API End-to-End Tests")
    print(f"  Base URL: {BASE_URL}")
    print(f"  Learner: {LEARNER_ID}")
    print("=" * 60)

    # 1. Constellation (Knowledge Graph)
    test("Constellation Map", "GET", "/constellation")

    # 2. Dashboard
    test("Dashboard", "GET", f"/dashboard/{LEARNER_ID}")

    # 3. Episode Engine - GET episode
    test("Get Episode", "GET", f"/episodes/data-structures?learner_id={LEARNER_ID}&concept_id=data-structures")

    # 4. Mentor Hint
    test("Mentor Hint (Level 1)", "POST", "/mentor/hint", {
        "learner_id": LEARNER_ID,
        "concept_id": "data-structures",
        "question": "I don't understand how dictionaries work in Python. Can you help?",
        "hint_level": 1
    })

    # 5. BKT Update
    test("BKT Update", "POST", "/bkt/update", {
        "learner_id": LEARNER_ID,
        "concept_id": "data-structures",
        "is_correct": True,
        "difficulty": 0.5
    })

    # 6. Leitner - Get due concepts
    test("Leitner Due Concepts", "GET", f"/leitner/due?learner_id={LEARNER_ID}")

    # 7. Leitner - Review
    test("Leitner Review", "POST", "/leitner/review", {
        "learner_id": LEARNER_ID,
        "concept_id": "data-structures",
        "correct": True
    })

    # 8. Struggle Detector
    test("Struggle Detector", "POST", "/struggle/signal", {
        "learner_id": LEARNER_ID,
        "concept_id": "oop-basics"
    })

    # 9. Bridge Sprint
    test("Bridge Sprint", "POST", "/bridge-sprint/generate", {
        "learner_id": LEARNER_ID,
        "target_concept_id": "trees"
    })

    # 10. Code Sandbox
    test("Code Sandbox", "POST", "/code/execute", {
        "learner_id": LEARNER_ID,
        "code": "print('Hello from PrimeLearn!')\nfor i in range(5):\n    print(f'Iteration {i}')"
    })

    print("\n" + "=" * 60)
    print("  All tests completed!")
    print("=" * 60)


if __name__ == '__main__':
    main()
