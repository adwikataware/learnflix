"""Deploy all updated Lambda functions + set Nova Pro env vars."""
import boto3
import zipfile
import os
import io

REGION = 'ap-south-1'
client = boto3.client('lambda', region_name=REGION)
BASE_DIR = r'D:\AIforBharat\PrimeLearn_Review'

NOVA_PRO = 'apac.amazon.nova-pro-v1:0'

LAMBDAS = {
    'primelearn-onboarding':       'primelearn-onboarding',
    'primelearn-episode-engine':   'primelearn-episode-engine',
    'primelearn-mentor':           'primelearn-mentor',
    'primelearn-bridge-sprint':    'primelearn-bridge-sprint',
}

# Only deploy the 4 Lambda files that were changed
for func_name, dir_name in LAMBDAS.items():
    lambda_file = os.path.join(BASE_DIR, dir_name, 'lambda_function.py')

    # Zip and upload
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(lambda_file, 'lambda_function.py')
    buf.seek(0)

    print(f"[{func_name}] Deploying code...", end=' ')
    client.update_function_code(FunctionName=func_name, ZipFile=buf.read())
    print("OK")

# Update env vars to Nova Pro
import time
print("\nWaiting 5s for code updates...")
time.sleep(5)

ALL_LAMBDAS = [
    'primelearn-onboarding',
    'primelearn-episode-engine',
    'primelearn-mentor',
    'primelearn-bkt-updater',
    'primelearn-leitner-scheduler',
    'primelearn-struggle-detector',
    'primelearn-bridge-sprint',
    'primelearn-code-sandbox',
]

for func_name in ALL_LAMBDAS:
    config = client.get_function_configuration(FunctionName=func_name)
    env_vars = config.get('Environment', {}).get('Variables', {})
    env_vars['HAIKU_MODEL_ID'] = NOVA_PRO
    if 'SONNET_MODEL_ID' in env_vars:
        env_vars['SONNET_MODEL_ID'] = NOVA_PRO

    print(f"[{func_name}] Setting env to Nova Pro...", end=' ')
    client.update_function_configuration(
        FunctionName=func_name,
        Environment={'Variables': env_vars}
    )
    print("OK")

print(f"\nAll done! Model: {NOVA_PRO}")
