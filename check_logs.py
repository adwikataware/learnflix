"""Check CloudWatch logs for recent Lambda errors."""
import boto3
import time

logs = boto3.client('logs', region_name='ap-south-1')

# Check mentor Lambda logs (most recent)
log_groups = [
    '/aws/lambda/primelearn-mentor',
    '/aws/lambda/primelearn-episode-engine',
    '/aws/lambda/primelearn-bridge-sprint',
]

for group_name in log_groups:
    print(f"\n{'='*60}")
    print(f"Log Group: {group_name}")
    print('='*60)

    try:
        # Get latest log stream
        streams = logs.describe_log_streams(
            logGroupName=group_name,
            orderBy='LastEventTime',
            descending=True,
            limit=1
        )['logStreams']

        if not streams:
            print("  No log streams found")
            continue

        stream = streams[0]
        print(f"  Latest stream: {stream['logStreamName']}")

        # Get events from the latest stream
        events = logs.get_log_events(
            logGroupName=group_name,
            logStreamName=stream['logStreamName'],
            limit=30,
            startFromHead=False
        )['events']

        for event in events:
            msg = event['message'].strip()
            if msg and ('error' in msg.lower() or 'Error' in msg or 'Exception' in msg or 'HAIKU' in msg or 'model' in msg.lower()):
                print(f"  {msg[:200]}")

        # Also print last 10 events for context
        print("\n  --- Last 10 events ---")
        for event in events[-10:]:
            msg = event['message'].strip()
            if msg:
                print(f"  {msg[:200]}")

    except Exception as e:
        print(f"  Error: {e}")
