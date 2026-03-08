"""Fix Bedrock model IDs in Lambda environment variables."""
import boto3

client = boto3.client('lambda', region_name='ap-south-1')

CORRECT_HAIKU = 'anthropic.claude-haiku-4-5-20251001-v1:0'
CORRECT_SONNET = 'anthropic.claude-sonnet-4-5-20250929-v1:0'

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
    # Get current config
    config = client.get_function_configuration(FunctionName=func_name)
    env_vars = config.get('Environment', {}).get('Variables', {})

    # Update model IDs
    env_vars['HAIKU_MODEL_ID'] = CORRECT_HAIKU
    if 'SONNET_MODEL_ID' in env_vars:
        env_vars['SONNET_MODEL_ID'] = CORRECT_SONNET

    client.update_function_configuration(
        FunctionName=func_name,
        Environment={'Variables': env_vars}
    )
    print(f"OK (env: {list(env_vars.keys())})")

print("\nAll model IDs updated!")
print(f"  Haiku: {CORRECT_HAIKU}")
print(f"  Sonnet: {CORRECT_SONNET}")
