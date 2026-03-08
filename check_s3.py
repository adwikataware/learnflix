import boto3
s3 = boto3.client('s3', region_name='ap-south-1')
buckets = s3.list_buckets()['Buckets']
print("S3 Buckets:")
for b in buckets:
    print(f"  {b['Name']} (created: {b['CreationDate']})")
if not buckets:
    print("  No buckets found!")

# Check if our target bucket exists
target = 'primelearn-content-cache-mumbai'
names = [b['Name'] for b in buckets]
if target in names:
    print(f"\n[OK] Target bucket '{target}' exists")
else:
    print(f"\n[MISSING] Target bucket '{target}' not found - creating it...")
    try:
        s3.create_bucket(
            Bucket=target,
            CreateBucketConfiguration={'LocationConstraint': 'ap-south-1'}
        )
        print(f"  Created '{target}' in ap-south-1")
    except Exception as e:
        print(f"  Error creating bucket: {e}")
