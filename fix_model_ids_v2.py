"""Fix Bedrock model IDs to use cross-region inference profiles."""
import boto3

client = boto3.client('lambda', region_name='ap-south-1')

# Use cross-region inference profile IDs
CORRECT_HAIKU = 'global.anthropic.claude-haiku-4-5-20251001-v1:0'
CORRECT_SONNET = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0'

LAMBDAS = [
    'primelearn-onboarding',
    'primelearn-episode-engine',
    'primelearn-mentor',
    'primelearn-bkt-updater',
    'primelearn-leitner-scheduler',
    'primelearn-struggle-detector',
    'primelearn-bridge-sprint',
    'primelearn-code-sandbox',
]

for func_name in LAMBDAS:
    print(f"Updating {func_name}...", end=' ')
    config = client.get_function_configuration(FunctionName=func_name)
    env_vars = config.get('Environment', {}).get('Variables', {})
    env_vars['HAIKU_MODEL_ID'] = CORRECT_HAIKU
    if 'SONNET_MODEL_ID' in env_vars:
        env_vars['SONNET_MODEL_ID'] = CORRECT_SONNET

    client.update_function_configuration(
        FunctionName=func_name,
        Environment={'Variables': env_vars}
    )
    print("OK")

print(f"\nAll updated!")
print(f"  Haiku: {CORRECT_HAIKU}")
print(f"  Sonnet: {CORRECT_SONNET}")

# Quick test from local
print("\nTesting Haiku invocation locally...")
import json
bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
try:
    res = bedrock.invoke_model(
        modelId=CORRECT_HAIKU,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say hello in one sentence."}]}]
        }),
        accept="application/json",
        contentType="application/json"
    )
    body = json.loads(res['body'].read())
    print(f"  Haiku says: {body['content'][0]['text']}")
except Exception as e:
    print(f"  Error: {e}")
