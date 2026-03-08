"""Check AWS account billing and marketplace status."""
import boto3

# Check if we can see payment verification status
org = boto3.client('organizations', region_name='us-east-1')
try:
    account = org.describe_account(AccountId='537327099189')
    print(f"Account: {account}")
except Exception as e:
    print(f"Org check: {e}")

# Check marketplace subscriptions
mp = boto3.client('marketplace-catalog', region_name='us-east-1')
try:
    entities = mp.list_entities(Catalog='AWSMarketplace', EntityType='Offer')
    print(f"Marketplace entities: {entities}")
except Exception as e:
    print(f"Marketplace: {e}")
