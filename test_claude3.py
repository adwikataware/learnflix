"""Test Claude 3 models (ON_DEMAND) as fallback."""
import boto3, json

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')

models_to_test = [
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'apac.anthropic.claude-3-haiku-20240307-v1:0',
    'apac.anthropic.claude-3-5-sonnet-20241022-v2:0',
]

for model_id in models_to_test:
    print(f"\nTesting: {model_id}")
    try:
        res = bedrock.invoke_model(
            modelId=model_id,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 100,
                "messages": [{"role": "user", "content": [{"type": "text", "text": "Say hello in one sentence."}]}]
            }),
            accept="application/json",
            contentType="application/json"
        )
        body = json.loads(res['body'].read())
        print(f"  OK: {body['content'][0]['text']}")
    except Exception as e:
        print(f"  ERROR: {str(e)[:200]}")
