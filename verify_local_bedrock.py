"""Verify Bedrock works from local credentials."""
import boto3, json

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
model_id = 'global.anthropic.claude-haiku-4-5-20251001-v1:0'

print(f"Testing model: {model_id}")
print(f"Using credentials: {boto3.client('sts', region_name='ap-south-1').get_caller_identity()['Arn']}")

try:
    res = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Say hello."}]}]
        }),
        accept="application/json",
        contentType="application/json"
    )
    body = json.loads(res['body'].read())
    print(f"SUCCESS: {body['content'][0]['text']}")
except Exception as e:
    print(f"ERROR: {e}")
