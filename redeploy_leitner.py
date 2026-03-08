import boto3, zipfile, io, os
client = boto3.client('lambda', region_name='ap-south-1')
path = r'D:\AIforBharat\PrimeLearn_Review\primelearn-leitner-scheduler\lambda_function.py'
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(path, 'lambda_function.py')
buf.seek(0)
client.update_function_code(FunctionName='primelearn-leitner-scheduler', ZipFile=buf.read())
print("Leitner scheduler redeployed!")
