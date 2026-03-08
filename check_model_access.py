"""Check Bedrock model access status."""
import boto3

bedrock = boto3.client('bedrock', region_name='ap-south-1')

# List model access
print("=== Model Access Status ===")
try:
    # Try list_model_invocation_access or get_model_access
    models = bedrock.list_foundation_models(byProvider='Anthropic')['modelSummaries']
    for m in models:
        model_id = m['modelId']
        # Check if model is accessible
        try:
            access = bedrock.get_foundation_model(modelIdentifier=model_id)
            model_info = access['modelDetails']
            status = model_info.get('modelLifecycle', {}).get('status', 'N/A')
            infer_types = model_info.get('inferenceTypesSupported', [])
            print(f"  {model_id}")
            print(f"    Status: {status}")
            print(f"    Inference types: {infer_types}")
        except Exception as e:
            print(f"  {model_id}: Error - {e}")
except Exception as e:
    print(f"Error: {e}")

# Also try listing model access directly
print("\n=== Cross-Region Inference Profiles ===")
try:
    profiles = bedrock.list_inference_profiles()
    for p in profiles.get('inferenceProfileSummaries', []):
        print(f"  {p.get('inferenceProfileName', 'N/A')} (ID: {p.get('inferenceProfileId', 'N/A')})")
        print(f"    Type: {p.get('type', 'N/A')}")
except Exception as e:
    print(f"Error: {e}")
