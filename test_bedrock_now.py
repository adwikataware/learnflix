"""Quick Bedrock test - single call."""
import boto3, json

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')

print("Testing Bedrock Haiku...")
try:
    res = bedrock.invoke_model(
        modelId='global.anthropic.claude-haiku-4-5-20251001-v1:0',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 30,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say OK in one word."}]}]
        }),
        accept="application/json",
        contentType="application/json"
    )
    body = json.loads(res['body'].read())
    print(f"  WORKING! Response: {body['content'][0]['text']}")
except Exception as e:
    err = str(e)
    if 'INVALID_PAYMENT' in err:
        print("  Still propagating... payment method needs more time.")
    else:
        print(f"  Error: {err[:200]}")
