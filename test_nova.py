"""Test Amazon Nova models - no Marketplace subscription needed, very cheap."""
import boto3, json

bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')

models = [
    ('apac.amazon.nova-micro-v1:0', 'Nova Micro (cheapest)'),
    ('apac.amazon.nova-lite-v1:0',  'Nova Lite (cheap)'),
    ('apac.amazon.nova-pro-v1:0',   'Nova Pro (moderate)'),
    ('global.anthropic.claude-sonnet-4-6', 'Sonnet 4.6 (expensive)'),
]

for model_id, label in models:
    print(f"\n{label}: {model_id}")
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
        text = body.get('content', [{}])[0].get('text', body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', 'N/A'))
        print(f"  WORKS: {text}")
    except Exception as e:
        # Nova uses different API format, try Converse API
        try:
            res = bedrock.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": [{"text": "Say OK"}]}],
                inferenceConfig={"maxTokens": 20}
            )
            text = res['output']['message']['content'][0]['text']
            print(f"  WORKS (converse): {text}")
        except Exception as e2:
            print(f"  FAIL: {str(e2)[:150]}")
