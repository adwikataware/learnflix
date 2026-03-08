"""Create all 6 DynamoDB tables for PrimeLearn."""
import boto3
import time

REGION = 'ap-south-1'
client = boto3.client('dynamodb', region_name=REGION)

TABLES = [
    {
        'TableName': 'KnowledgeGraph',
        'KeySchema': [{'AttributeName': 'concept_id', 'KeyType': 'HASH'}],
        'AttributeDefinitions': [{'AttributeName': 'concept_id', 'AttributeType': 'S'}],
    },
    {
        'TableName': 'LearnerState',
        'KeySchema': [{'AttributeName': 'learner_id', 'KeyType': 'HASH'}],
        'AttributeDefinitions': [{'AttributeName': 'learner_id', 'AttributeType': 'S'}],
    },
    {
        'TableName': 'LearnerMastery',
        'KeySchema': [
            {'AttributeName': 'learner_id', 'KeyType': 'HASH'},
            {'AttributeName': 'concept_id', 'KeyType': 'RANGE'},
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'learner_id', 'AttributeType': 'S'},
            {'AttributeName': 'concept_id', 'AttributeType': 'S'},
        ],
    },
    {
        'TableName': 'LeitnerBox',
        'KeySchema': [
            {'AttributeName': 'learner_id', 'KeyType': 'HASH'},
            {'AttributeName': 'concept_id', 'KeyType': 'RANGE'},
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'learner_id', 'AttributeType': 'S'},
            {'AttributeName': 'concept_id', 'AttributeType': 'S'},
        ],
    },
    {
        'TableName': 'SessionLogs',
        'KeySchema': [
            {'AttributeName': 'learner_id', 'KeyType': 'HASH'},
            {'AttributeName': 'timestamp', 'KeyType': 'RANGE'},
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'learner_id', 'AttributeType': 'S'},
            {'AttributeName': 'timestamp', 'AttributeType': 'S'},
        ],
    },
    {
        'TableName': 'Assessments',
        'KeySchema': [
            {'AttributeName': 'learner_id', 'KeyType': 'HASH'},
            {'AttributeName': 'assessment_id', 'KeyType': 'RANGE'},
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'learner_id', 'AttributeType': 'S'},
            {'AttributeName': 'assessment_id', 'AttributeType': 'S'},
        ],
    },
]

def create_all_tables():
    existing = client.list_tables()['TableNames']
    print(f"Existing tables: {existing}")

    for table_def in TABLES:
        name = table_def['TableName']
        if name in existing:
            print(f"  [SKIP] {name} already exists")
            continue

        print(f"  [CREATE] {name}...", end=' ')
        client.create_table(
            TableName=name,
            KeySchema=table_def['KeySchema'],
            AttributeDefinitions=table_def['AttributeDefinitions'],
            BillingMode='PAY_PER_REQUEST',
        )
        print("created!")

    # Wait for all tables to become ACTIVE
    print("\nWaiting for tables to become ACTIVE...")
    for table_def in TABLES:
        name = table_def['TableName']
        while True:
            resp = client.describe_table(TableName=name)
            status = resp['Table']['TableStatus']
            if status == 'ACTIVE':
                print(f"  {name}: ACTIVE")
                break
            print(f"  {name}: {status} (waiting...)")
            time.sleep(2)

    print("\nAll tables are ACTIVE!")

if __name__ == '__main__':
    create_all_tables()
