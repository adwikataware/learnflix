import boto3
client = boto3.client('lambda', region_name='ap-south-1')
funcs = client.list_functions()['Functions']
for f in funcs:
    print(f"{f['FunctionName']} | Runtime: {f.get('Runtime','N/A')} | Timeout: {f.get('Timeout','N/A')}s | Role: {f.get('Role','N/A').split('/')[-1]}")
print(f"\nTotal: {len(funcs)} functions")
