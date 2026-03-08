"""Check API Gateway configuration."""
import boto3
import json

apigw = boto3.client('apigateway', region_name='ap-south-1')

# List all REST APIs
apis = apigw.get_rest_apis()['items']
print("REST APIs:")
for api in apis:
    print(f"  {api['name']} (ID: {api['id']})")

# For our API, get resources
API_ID = 'tpgaxfppr9'
print(f"\nResources for API {API_ID}:")
resources = apigw.get_resources(restApiId=API_ID, limit=100)['items']
for r in sorted(resources, key=lambda x: x.get('path', '')):
    methods = list(r.get('resourceMethods', {}).keys()) if r.get('resourceMethods') else ['(none)']
    print(f"  {r['path']} -> {', '.join(methods)}")

# Check deployments/stages
stages = apigw.get_stages(restApiId=API_ID)['item']
print(f"\nStages:")
for s in stages:
    print(f"  {s['stageName']} (deployed: {s.get('lastUpdatedDate', 'N/A')})")
