"""Check API Gateway integration details for each route."""
import boto3
import json

apigw = boto3.client('apigateway', region_name='ap-south-1')
API_ID = 'tpgaxfppr9'

resources = apigw.get_resources(restApiId=API_ID, limit=100)['items']

for r in sorted(resources, key=lambda x: x.get('path', '')):
    methods = r.get('resourceMethods', {})
    for method_name in methods:
        if method_name == 'OPTIONS':
            continue
        try:
            integration = apigw.get_integration(
                restApiId=API_ID,
                resourceId=r['id'],
                httpMethod=method_name
            )
            uri = integration.get('uri', 'N/A')
            int_type = integration.get('type', 'N/A')
            # Extract Lambda name from URI
            lambda_name = 'N/A'
            if 'function:' in uri:
                lambda_name = uri.split('function:')[1].split('/')[0]
            print(f"  {method_name} {r['path']} -> {int_type} -> {lambda_name}")
        except Exception as e:
            print(f"  {method_name} {r['path']} -> ERROR: {e}")
