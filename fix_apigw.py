"""
Fix API Gateway configuration:
1. Change all integrations from AWS to AWS_PROXY
2. Fix wrong Lambda mappings (dashboard -> episode-engine)
3. Add missing routes: /constellation, /bkt/update, /leitner/review
4. Redeploy to 'dev' stage
"""
import boto3
import json
import time

REGION = 'ap-south-1'
ACCOUNT_ID = '537327099189'
API_ID = 'tpgaxfppr9'
STAGE = 'dev'

apigw = boto3.client('apigateway', region_name=REGION)
lambda_client = boto3.client('lambda', region_name=REGION)

def get_lambda_uri(func_name):
    """Build the Lambda invocation URI for API Gateway AWS_PROXY integration."""
    return (
        f"arn:aws:apigateway:{REGION}:lambda:path/2015-03-31/functions/"
        f"arn:aws:lambda:{REGION}:{ACCOUNT_ID}:function:{func_name}/invocations"
    )

def ensure_lambda_permission(func_name, source_arn):
    """Add permission for API Gateway to invoke the Lambda (idempotent)."""
    try:
        lambda_client.add_permission(
            FunctionName=func_name,
            StatementId=f"apigateway-{func_name}-{hash(source_arn) % 10000}",
            Action='lambda:InvokeFunction',
            Principal='apigateway.amazonaws.com',
            SourceArn=source_arn
        )
        print(f"    Added invoke permission for {func_name}")
    except lambda_client.exceptions.ResourceConflictException:
        pass  # Permission already exists
    except Exception as e:
        print(f"    Permission warning (non-fatal): {e}")

def find_or_create_resource(path):
    """Find an existing resource or create it (with parents)."""
    resources = apigw.get_resources(restApiId=API_ID, limit=100)['items']
    resource_map = {r['path']: r['id'] for r in resources}

    if path in resource_map:
        return resource_map[path]

    # Need to create - find parent first
    parts = path.strip('/').split('/')
    parent_path = '/' + '/'.join(parts[:-1]) if len(parts) > 1 else '/'
    parent_id = resource_map.get(parent_path)

    if not parent_id:
        # Create parent recursively
        parent_id = find_or_create_resource(parent_path)

    # Create the resource
    part_name = parts[-1]
    resp = apigw.create_resource(
        restApiId=API_ID,
        parentId=parent_id,
        pathPart=part_name
    )
    print(f"  Created resource: {path}")
    return resp['id']

def setup_cors(resource_id, path):
    """Setup OPTIONS method for CORS."""
    try:
        apigw.put_method(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            authorizationType='NONE'
        )
    except apigw.exceptions.ConflictException:
        pass

    try:
        apigw.put_integration(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            type='MOCK',
            requestTemplates={'application/json': '{"statusCode": 200}'}
        )
    except:
        pass

    try:
        apigw.put_method_response(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': False,
                'method.response.header.Access-Control-Allow-Methods': False,
                'method.response.header.Access-Control-Allow-Origin': False,
            }
        )
    except:
        pass

    try:
        apigw.put_integration_response(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
                'method.response.header.Access-Control-Allow-Origin': "'*'",
            }
        )
    except:
        pass

def setup_route(method, path, lambda_name):
    """Setup a complete API Gateway route with AWS_PROXY integration."""
    print(f"\n  Setting up {method} {path} -> {lambda_name}")

    resource_id = find_or_create_resource(path)

    # Delete existing method if any (to recreate with AWS_PROXY)
    try:
        apigw.delete_method(
            restApiId=API_ID,
            resourceId=resource_id,
            httpMethod=method
        )
        print(f"    Deleted existing {method} method")
    except:
        pass

    # Create method
    apigw.put_method(
        restApiId=API_ID,
        resourceId=resource_id,
        httpMethod=method,
        authorizationType='NONE'
    )
    print(f"    Created {method} method")

    # Create AWS_PROXY integration
    lambda_uri = get_lambda_uri(lambda_name)
    apigw.put_integration(
        restApiId=API_ID,
        resourceId=resource_id,
        httpMethod=method,
        type='AWS_PROXY',
        integrationHttpMethod='POST',
        uri=lambda_uri
    )
    print(f"    Set AWS_PROXY integration -> {lambda_name}")

    # Ensure Lambda permission
    source_arn = f"arn:aws:execute-api:{REGION}:{ACCOUNT_ID}:{API_ID}/*/{method}{path}"
    ensure_lambda_permission(lambda_name, source_arn)

    # Setup CORS
    setup_cors(resource_id, path)


def main():
    print("=" * 60)
    print("  Fixing API Gateway Configuration")
    print(f"  API: {API_ID} | Stage: {STAGE}")
    print("=" * 60)

    # All routes that should exist
    ROUTES = [
        # Onboarding
        ('POST', '/auth/register',              'primelearn-onboarding'),
        ('POST', '/onboarding/goal',            'primelearn-onboarding'),
        ('GET',  '/onboarding/assessment',      'primelearn-onboarding'),
        ('POST', '/onboarding/assessment/answer','primelearn-onboarding'),

        # Episode Engine (includes dashboard + constellation)
        ('GET',  '/episodes/{episode_id}',      'primelearn-episode-engine'),
        ('POST', '/episodes/{episode_id}/progress', 'primelearn-episode-engine'),
        ('GET',  '/dashboard/{learner_id}',     'primelearn-episode-engine'),  # FIX: was bkt-updater
        ('GET',  '/constellation',              'primelearn-episode-engine'),  # NEW

        # Mentor
        ('POST', '/mentor/hint',                'primelearn-mentor'),

        # BKT
        ('POST', '/bkt/update',                 'primelearn-bkt-updater'),  # NEW

        # Leitner
        ('GET',  '/leitner/due',                'primelearn-leitner-scheduler'),
        ('POST', '/leitner/review',             'primelearn-leitner-scheduler'),  # NEW

        # Struggle
        ('POST', '/struggle/signal',            'primelearn-struggle-detector'),

        # Bridge Sprint
        ('POST', '/bridge-sprint/generate',     'primelearn-bridge-sprint'),

        # Code Sandbox
        ('POST', '/code/execute',               'primelearn-code-sandbox'),

        # Video Generation
        ('POST', '/video/generate',             'primelearn-episode-engine'),
        ('GET',  '/video/status',               'primelearn-episode-engine'),

        # Visualizations
        ('POST', '/visualizations/generate',    'primelearn-episode-engine'),

        # Notes from upload
        ('POST', '/notes/generate',             'primelearn-episode-engine'),

        # Season Finale
        ('POST', '/season-finale/generate',     'primelearn-episode-engine'),
        ('POST', '/season-finale/submit',       'primelearn-episode-engine'),
        ('GET',  '/season-finale/{learner_id}', 'primelearn-episode-engine'),
    ]

    for method, path, lambda_name in ROUTES:
        setup_route(method, path, lambda_name)

    # Deploy to 'dev' stage
    print(f"\n\nDeploying to '{STAGE}' stage...")
    apigw.create_deployment(
        restApiId=API_ID,
        stageName=STAGE,
        description='Fixed integrations to AWS_PROXY + added missing routes'
    )
    print("  Deployed!")

    print("\n" + "=" * 60)
    print("  API Gateway fix complete!")
    print(f"  URL: https://{API_ID}.execute-api.{REGION}.amazonaws.com/{STAGE}")
    print("=" * 60)


if __name__ == '__main__':
    main()
