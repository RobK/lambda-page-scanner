@echo off
RMDIR lambda\node_modules\ /S /q
cd lambda 
call npm install
set
cd ..
echo Packing and uploading...
call aws cloudformation package --template-file stack.yaml --output-template-file serverless-output.yaml --s3-bucket kehoro-tmp-scanner

echo Deploying package...
call aws cloudformation deploy --template-file serverless-output.yaml --stack-name lambda-page-scanner --parameter-overrides NotificationEmail=cherrio@gmail.com --capabilities CAPABILITY_IAM