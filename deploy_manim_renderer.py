"""
Deploy the primelearn-manim-renderer Lambda (container image).
Steps:
  1. Create ECR repository (if not exists)
  2. Docker login to ECR
  3. Build Docker image
  4. Push to ECR
  5. Create/update Lambda function from container image
  6. Add Lambda invoke permission for episode-engine
  7. Update episode-engine env var
"""
import boto3
import subprocess
import json
import time
import sys

REGION = 'ap-south-1'
ACCOUNT_ID = '537327099189'
ECR_REPO_NAME = 'primelearn-manim-renderer'
LAMBDA_NAME = 'primelearn-manim-renderer'
LAMBDA_ROLE = f'arn:aws:iam::{ACCOUNT_ID}:role/primelearn-lambda-role'
IMAGE_TAG = 'latest'
BASE_DIR = r'D:\AIforBharat\PrimeLearn_Review\primelearn-manim-renderer'

ecr = boto3.client('ecr', region_name=REGION)
lambda_client = boto3.client('lambda', region_name=REGION)
iam = boto3.client('iam')


def create_ecr_repo():
    """Create ECR repository if it doesn't exist."""
    try:
        ecr.create_repository(
            repositoryName=ECR_REPO_NAME,
            imageScanningConfiguration={'scanOnPush': False},
            imageTagMutability='MUTABLE'
        )
        print(f"  Created ECR repo: {ECR_REPO_NAME}")
    except ecr.exceptions.RepositoryAlreadyExistsException:
        print(f"  ECR repo already exists: {ECR_REPO_NAME}")


def get_ecr_uri():
    return f"{ACCOUNT_ID}.dkr.ecr.{REGION}.amazonaws.com/{ECR_REPO_NAME}"


def docker_login():
    """Login to ECR via Docker."""
    cmd = f'aws ecr get-login-password --region {REGION} | docker login --username AWS --password-stdin {ACCOUNT_ID}.dkr.ecr.{REGION}.amazonaws.com'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  Docker login FAILED: {result.stderr}")
        sys.exit(1)
    print("  Docker logged in to ECR")


def build_and_push():
    """Build Docker image and push to ECR."""
    image_uri = f"{get_ecr_uri()}:{IMAGE_TAG}"

    print(f"  Building Docker image (this may take a few minutes)...")
    result = subprocess.run(
        ['docker', 'build', '-t', ECR_REPO_NAME, '.'],
        cwd=BASE_DIR, capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  Build FAILED:\n{result.stderr[-2000:]}")
        sys.exit(1)
    print("  Build complete!")

    print(f"  Tagging as {image_uri}...")
    subprocess.run(
        ['docker', 'tag', f'{ECR_REPO_NAME}:latest', image_uri],
        check=True
    )

    print(f"  Pushing to ECR (this may take a few minutes for ~800MB image)...")
    result = subprocess.run(
        ['docker', 'push', image_uri],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  Push FAILED:\n{result.stderr[-2000:]}")
        sys.exit(1)
    print("  Push complete!")
    return image_uri


def create_or_update_lambda(image_uri):
    """Create Lambda from container image, or update if exists."""
    try:
        lambda_client.get_function(FunctionName=LAMBDA_NAME)
        # Exists — update code
        print(f"  Updating Lambda code...")
        lambda_client.update_function_code(
            FunctionName=LAMBDA_NAME,
            ImageUri=image_uri
        )
        print(f"  Code updated. Waiting for propagation...")
        time.sleep(10)
    except lambda_client.exceptions.ResourceNotFoundException:
        # Create new
        print(f"  Creating Lambda function from container image...")
        lambda_client.create_function(
            FunctionName=LAMBDA_NAME,
            Role=LAMBDA_ROLE,
            Code={'ImageUri': image_uri},
            PackageType='Image',
            Timeout=600,
            MemorySize=1024,
            Environment={
                'Variables': {
                    'S3_CONTENT_BUCKET': 'primelearn-content-cache-mumbai',
                    'MANIM_QUALITY': '-ql',
                }
            },
            Architectures=['x86_64'],
        )
        print(f"  Lambda created! Waiting for active state...")
        time.sleep(15)

    # Configure timeout and memory
    try:
        lambda_client.update_function_configuration(
            FunctionName=LAMBDA_NAME,
            Timeout=600,
            MemorySize=1024,
            Environment={
                'Variables': {
                    'S3_CONTENT_BUCKET': 'primelearn-content-cache-mumbai',
                    'MANIM_QUALITY': '-ql',
                }
            }
        )
        print(f"  Configured: timeout=600s, memory=1024MB")
    except Exception as e:
        print(f"  Config update (will retry on next deploy): {e}")


def add_invoke_permission():
    """Allow episode-engine Lambda to invoke the renderer."""
    try:
        lambda_client.add_permission(
            FunctionName=LAMBDA_NAME,
            StatementId='allow-episode-engine-invoke',
            Action='lambda:InvokeFunction',
            Principal='lambda.amazonaws.com',
            SourceArn=f'arn:aws:lambda:{REGION}:{ACCOUNT_ID}:function:primelearn-episode-engine'
        )
        print("  Added invoke permission for episode-engine")
    except lambda_client.exceptions.ResourceConflictException:
        print("  Invoke permission already exists")


def add_iam_invoke_policy():
    """Add lambda:InvokeFunction permission to the Lambda role."""
    policy_name = 'PrimeLearnLambdaInvokeRenderer'
    policy_doc = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": f"arn:aws:lambda:{REGION}:{ACCOUNT_ID}:function:{LAMBDA_NAME}"
        }]
    })
    try:
        iam.put_role_policy(
            RoleName='primelearn-lambda-role',
            PolicyName=policy_name,
            PolicyDocument=policy_doc
        )
        print(f"  Added IAM inline policy: {policy_name}")
    except Exception as e:
        print(f"  IAM policy update: {e}")


def update_episode_engine_env():
    """Add MANIM_RENDERER_FUNCTION to episode-engine's env vars."""
    try:
        config = lambda_client.get_function_configuration(FunctionName='primelearn-episode-engine')
        env_vars = config.get('Environment', {}).get('Variables', {})
        env_vars['MANIM_RENDERER_FUNCTION'] = LAMBDA_NAME
        lambda_client.update_function_configuration(
            FunctionName='primelearn-episode-engine',
            Environment={'Variables': env_vars}
        )
        print(f"  Updated episode-engine env: MANIM_RENDERER_FUNCTION={LAMBDA_NAME}")
    except Exception as e:
        print(f"  Episode engine env update: {e}")


def main():
    print("=" * 60)
    print("  PrimeLearn Manim Renderer Deployment")
    print("=" * 60)

    print("\n--- Step 1: ECR Repository ---")
    create_ecr_repo()

    print("\n--- Step 2: Docker Login ---")
    docker_login()

    print("\n--- Step 3: Build & Push ---")
    image_uri = build_and_push()

    print("\n--- Step 4: Lambda Function ---")
    create_or_update_lambda(image_uri)

    print("\n--- Step 5: Permissions ---")
    add_invoke_permission()
    add_iam_invoke_policy()

    print("\n--- Step 6: Episode Engine Config ---")
    update_episode_engine_env()

    print("\n" + "=" * 60)
    print("  Deployment complete!")
    print(f"  Image: {image_uri}")
    print(f"  Lambda: {LAMBDA_NAME}")
    print("=" * 60)


if __name__ == '__main__':
    main()
