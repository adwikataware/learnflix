"""Try different models and APIs to find what works."""
import boto3, json

# Try from both regions and different model IDs
tests = [
    ('ap-south-1', 'global.anthropic.claude-sonnet-4-6'),
    ('ap-south-1', 'anthropic.claude-sonnet-4-6'),
    ('us-east-1',  'anthropic.claude-sonnet-4-6'),
    ('ap-south-1', 'global.anthropic.claude-haiku-4-5-20251001-v1:0'),
    ('us-east-1',  'anthropic.claude-3-haiku-20240307-v1:0'),
]

for region, model_id in tests:
    print(f"\n{region} | {model_id}")
    bedrock = boto3.client('bedrock-runtime', region_name=region)
    try:
        res = bedrock.invoke_model(
            modelId=model_id,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 20,
                "messages": [{"role": "user", "content": [{"type": "text", "text": "Say OK"}]}]
            }),
            accept="application/json",
            contentType="application/json"
        )
        body = json.loads(res['body'].read())
        print(f"  OK: {body['content'][0]['text']}")
    except Exception as e:
        err = str(e)[:150]
        print(f"  FAIL: {err}")

# Also try Converse API (what playground might use)
print("\n--- Converse API ---")
for region, model_id in [('us-east-1', 'anthropic.claude-sonnet-4-6'), ('ap-south-1', 'global.anthropic.claude-sonnet-4-6')]:
    print(f"\n{region} | {model_id} (Converse)")
    bedrock = boto3.client('bedrock-runtime', region_name=region)
    try:
        res = bedrock.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": "Say OK"}]}],
            inferenceConfig={"maxTokens": 20}
        )
        text = res['output']['message']['content'][0]['text']
        print(f"  OK: {text}")
    except Exception as e:
        err = str(e)[:150]
        print(f"  FAIL: {err}")
