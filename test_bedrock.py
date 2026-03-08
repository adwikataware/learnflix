"""Test Bedrock model availability and guardrails."""
import boto3, json

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
bedrock_mgmt = boto3.client('bedrock', region_name='ap-south-1')

# Check available models
print("=== Foundation Models (Anthropic) ===")
try:
    models = bedrock_mgmt.list_foundation_models(byProvider='Anthropic')['modelSummaries']
    for m in models:
        print(f"  {m['modelId']} ({m.get('modelLifecycle', {}).get('status', 'N/A')})")
except Exception as e:
    print(f"  Error listing models: {e}")

# Check guardrails
print("\n=== Guardrails ===")
try:
    guardrails = bedrock_mgmt.list_guardrails()['guardrails']
    for g in guardrails:
        print(f"  {g['name']} (ID: {g['id']}, Version: {g.get('version', 'N/A')})")
except Exception as e:
    print(f"  Error listing guardrails: {e}")

# Test Haiku invocation
print("\n=== Test Haiku Invocation ===")
try:
    res = bedrock.invoke_model(
        modelId='anthropic.claude-haiku-4-5',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say hello in one sentence."}]}]
        }),
        accept="application/json",
        contentType="application/json"
    )
    body = json.loads(res['body'].read())
    print(f"  Response: {body['content'][0]['text']}")
except Exception as e:
    print(f"  Haiku Error: {e}")

# Test with guardrail
print("\n=== Test Haiku + Guardrail ===")
try:
    res = bedrock.invoke_model(
        modelId='anthropic.claude-haiku-4-5',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say hello in one sentence."}]}]
        }),
        accept="application/json",
        contentType="application/json",
        guardrailIdentifier="eaul167bm603",
        guardrailVersion="DRAFT"
    )
    body = json.loads(res['body'].read())
    print(f"  Response: {body['content'][0]['text']}")
except Exception as e:
    print(f"  Guardrail Error: {e}")
