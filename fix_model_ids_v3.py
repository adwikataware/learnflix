"""Switch all Lambdas to use Claude Sonnet 4.6 (global inference profile) which works."""
import boto3

client = boto3.client('lambda', region_name='ap-south-1')

# Sonnet 4.6 works via global inference profile
WORKING_MODEL = 'global.anthropic.claude-sonnet-4-6'

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

    # Use Sonnet 4.6 for everything (it works!)
    env_vars['HAIKU_MODEL_ID'] = WORKING_MODEL
    if 'SONNET_MODEL_ID' in env_vars:
        env_vars['SONNET_MODEL_ID'] = WORKING_MODEL

    client.update_function_configuration(
        FunctionName=func_name,
        Environment={'Variables': env_vars}
    )
    print("OK")

print(f"\nAll Lambdas now using: {WORKING_MODEL}")
