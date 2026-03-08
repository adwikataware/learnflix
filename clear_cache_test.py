"""Clear S3 episode cache and retest episode generation."""
import boto3, requests, json, time

s3 = boto3.client('s3', region_name='ap-south-1')
BUCKET = 'primelearn-content-cache-mumbai'

# List and delete cached episodes
print("Clearing S3 episode cache...")
try:
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix='episodes/')
    for obj in resp.get('Contents', []):
        print(f"  Deleting: {obj['Key']}")
        s3.delete_object(Bucket=BUCKET, Key=obj['Key'])
    print("  Cache cleared!\n")
except Exception as e:
    print(f"  {e}\n")

# Test episode generation (fresh, no cache)
BASE_URL = "https://tpgaxfppr9.execute-api.ap-south-1.amazonaws.com/dev"

print("Testing episode generation (no cache)...")
resp = requests.get(f"{BASE_URL}/episodes/oop-basics?learner_id=demo_learner_001&concept_id=oop-basics", timeout=90)
data = resp.json()
content = data.get('content', '')
is_gen = 'temporarily unavailable' not in content
print(f"Status: {resp.status_code}")
print(f"Title: {data.get('title')}")
print(f"Format: {data.get('format')}")
print(f"Model: {data.get('model_used')}")
print(f"RAG: {data.get('rag_grounded')}")
print(f"Content preview: {content[:300]}...")
print(f"\nResult: {'AI WORKING!' if is_gen else 'STILL FALLBACK'}")
