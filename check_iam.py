"""Check and add IAM permissions for PrimeLearn Lambda role."""
import boto3
import json

iam = boto3.client('iam', region_name='ap-south-1')

ROLE_NAME = 'primelearn-lambda-role'

# Get current role policies
print(f"Role: {ROLE_NAME}")
print("\n--- Attached Managed Policies ---")
attached = iam.list_attached_role_policies(RoleName=ROLE_NAME)['AttachedPolicies']
for p in attached:
    print(f"  {p['PolicyName']} ({p['PolicyArn']})")

print("\n--- Inline Policies ---")
inline = iam.list_role_policies(RoleName=ROLE_NAME)['PolicyNames']
for name in inline:
    policy = iam.get_role_policy(RoleName=ROLE_NAME, PolicyName=name)
    print(f"  {name}:")
    print(f"    {json.dumps(policy['PolicyDocument'], indent=4)}")

print(f"\nTotal: {len(attached)} managed + {len(inline)} inline")
