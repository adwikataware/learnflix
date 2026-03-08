import boto3
for r in ['ap-south-1', 'us-east-1', 'us-west-2']:
    tables = boto3.client('dynamodb', region_name=r).list_tables()['TableNames']
    print(f"{r}: {tables}")
