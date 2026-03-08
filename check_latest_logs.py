"""Check the very latest Lambda logs to see the actual error."""
import boto3
import time

logs = boto3.client('logs', region_name='ap-south-1')

# Check mentor Lambda - get ALL recent events
group = '/aws/lambda/primelearn-mentor'
print(f"Log Group: {group}")

streams = logs.describe_log_streams(
    logGroupName=group,
    orderBy='LastEventTime',
    descending=True,
    limit=3
)['logStreams']

for stream in streams[:3]:
    print(f"\nStream: {stream['logStreamName']}")
    events = logs.get_log_events(
        logGroupName=group,
        logStreamName=stream['logStreamName'],
        limit=20,
        startFromHead=False
    )['events']

    for event in events:
        msg = event['message'].strip()
        if msg:
            print(f"  {msg[:300]}")
