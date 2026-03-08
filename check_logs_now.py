import boto3

logs = boto3.client('logs', region_name='ap-south-1')
group = '/aws/lambda/primelearn-mentor'

streams = logs.describe_log_streams(
    logGroupName=group, orderBy='LastEventTime', descending=True, limit=1
)['logStreams']

stream = streams[0]['logStreamName']
events = logs.get_log_events(
    logGroupName=group, logStreamName=stream, limit=15, startFromHead=False
)['events']

for e in events:
    msg = e['message'].strip()
    if msg:
        print(msg[:300])
