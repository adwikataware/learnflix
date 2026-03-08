"""
Deploy all 8 PrimeLearn Lambda functions.
Zips each lambda_function.py and uploads via update-function-code.
Also sets environment variables and timeouts.
"""
import boto3
import zipfile
import os
import io
import json

REGION = 'ap-south-1'
client = boto3.client('lambda', region_name=REGION)

BASE_DIR = r'D:\AIforBharat\PrimeLearn_Review'

# Lambda name -> directory name mapping
LAMBDAS = {
    'primelearn-onboarding':       'primelearn-onboarding',
    'primelearn-episode-engine':   'primelearn-episode-engine',
    'primelearn-mentor':           'primelearn-mentor',
    'primelearn-bkt-updater':      'primelearn-bkt-updater',
    'primelearn-leitner-scheduler':'primelearn-leitner-scheduler',
    'primelearn-struggle-detector':'primelearn-struggle-detector',
    'primelearn-bridge-sprint':    'primelearn-bridge-sprint',
    'primelearn-code-sandbox':     'primelearn-code-sandbox',
}

# Environment variables for each Lambda
COMMON_ENV = {
    'HAIKU_MODEL_ID': 'anthropic.claude-haiku-4-5',
}

LAMBDA_ENV = {
    'primelearn-episode-engine': {
        **COMMON_ENV,
        'SONNET_MODEL_ID': 'anthropic.claude-sonnet-4-5',
        'S3_CONTENT_BUCKET': 'primelearn-content-cache-mumbai',
        'KNOWLEDGE_BASE_ID': 'QCA57QK7UJ',
        'GUARDRAIL_ID': 'eaul167bm603',
        'GUARDRAIL_VERSION': 'DRAFT',
        'MANIM_RENDERER_FUNCTION': 'primelearn-manim-renderer',
    },
    'primelearn-mentor': {
        **COMMON_ENV,
        'GUARDRAIL_ID': 'eaul167bm603',
        'GUARDRAIL_VERSION': 'DRAFT',
    },
    'primelearn-bridge-sprint': {
        **COMMON_ENV,
        'S3_CONTENT_BUCKET': 'primelearn-content-cache-mumbai',
        'KNOWLEDGE_BASE_ID': 'QCA57QK7UJ',
    },
    'primelearn-onboarding': {**COMMON_ENV},
    'primelearn-bkt-updater': {**COMMON_ENV},
    'primelearn-leitner-scheduler': {**COMMON_ENV},
    'primelearn-struggle-detector': {**COMMON_ENV},
    'primelearn-code-sandbox': {**COMMON_ENV},
}

# Timeouts (seconds) - Bedrock-calling functions need more time
LAMBDA_TIMEOUTS = {
    'primelearn-episode-engine':   180,
    'primelearn-mentor':           60,
    'primelearn-bridge-sprint':    60,
    'primelearn-onboarding':       60,
    'primelearn-bkt-updater':      30,
    'primelearn-leitner-scheduler':30,
    'primelearn-struggle-detector':30,
    'primelearn-code-sandbox':     60,
}

# Memory (MB) - only override where needed (default is 128MB)
LAMBDA_MEMORY = {
    'primelearn-episode-engine':   1024,
    'primelearn-mentor':           256,
    'primelearn-bridge-sprint':    256,
    'primelearn-onboarding':       256,
}


def deploy_lambda(func_name, dir_name):
    """Zip and deploy a single Lambda function."""
    lambda_dir = os.path.join(BASE_DIR, dir_name)
    lambda_file = os.path.join(lambda_dir, 'lambda_function.py')

    if not os.path.exists(lambda_file):
        print(f"  [ERROR] {lambda_file} not found!")
        return False

    # Create zip in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(lambda_file, 'lambda_function.py')
    zip_buffer.seek(0)

    # Upload code
    print(f"  [{func_name}] Uploading code...", end=' ')
    try:
        client.update_function_code(
            FunctionName=func_name,
            ZipFile=zip_buffer.read()
        )
        print("OK")
    except Exception as e:
        print(f"FAILED: {e}")
        return False

    return True


def configure_lambda(func_name):
    """Set environment variables, timeout, and memory for a Lambda function."""
    env_vars = LAMBDA_ENV.get(func_name, COMMON_ENV)
    timeout = LAMBDA_TIMEOUTS.get(func_name, 30)
    memory = LAMBDA_MEMORY.get(func_name, 128)

    print(f"  [{func_name}] Setting timeout={timeout}s, memory={memory}MB, env={list(env_vars.keys())}...", end=' ')
    try:
        client.update_function_configuration(
            FunctionName=func_name,
            Timeout=timeout,
            MemorySize=memory,
            Environment={'Variables': env_vars}
        )
        print("OK")
    except Exception as e:
        print(f"FAILED: {e}")
        return False
    return True


def main():
    print("=" * 60)
    print("  PrimeLearn Lambda Deployment")
    print("  Region:", REGION)
    print("=" * 60)

    # Step 1: Deploy code
    print("\n--- Step 1: Deploying Lambda code ---")
    for func_name, dir_name in LAMBDAS.items():
        deploy_lambda(func_name, dir_name)

    # Step 2: Configure env vars and timeouts
    # Need to wait a bit for code updates to propagate
    import time
    print("\nWaiting 5s for code updates to propagate...")
    time.sleep(5)

    print("\n--- Step 2: Configuring environment & timeouts ---")
    for func_name in LAMBDAS:
        configure_lambda(func_name)

    print("\n" + "=" * 60)
    print("  Deployment complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
