"""Recheck if Sonnet 4.6 still works locally."""
import boto3, json

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
sts = boto3.client('sts', region_name='ap-south-1')
print(f"Caller: {sts.get_caller_identity()['Arn']}")

model = 'global.anthropic.claude-sonnet-4-6'
print(f"\nTesting: {model}")
try:
    res = bedrock.invoke_model(
        modelId=model,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 20,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say OK"}]}]
        }),
        accept="application/json",
        contentType="application/json"
    )
    body = json.loads(res['body'].read())
    print(f"WORKS: {body['content'][0]['text']}")
except Exception as e:
    print(f"FAIL: {str(e)[:200]}")
