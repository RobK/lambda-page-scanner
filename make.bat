@echo off

set NOTIFICATION_EMAIL=cherrio@gmail.com
set BUCKET_NAME=kehoro-tmp-scanner
set CRONSCHEDULE=5 6-16 ? * * *

IF "%1"=="deploy" (
    GOTO deploy
) ELSE IF "%1"=="" (
    GOTO deploy
) ELSE (
    GOTO Invalid
)

:deploy
cd lambda 
echo Preparing...
RMDIR node_modules\ /S /q
call npm install --production
cd ..
echo Packing and uploading...
call aws cloudformation package --template-file stack.yaml ^
    --output-template-file serverless-output.yaml ^
    --s3-bucket %BUCKET_NAME%
echo Deploying package...
call aws cloudformation deploy --template-file serverless-output.yaml ^
    --stack-name lambda-page-scanner ^
    --parameter-overrides NotificationEmail=%NOTIFICATION_EMAIL% ^
    --parameter-overrides "CronSchedule=%CRONSCHEDULE%" ^
    --capabilities CAPABILITY_IAM
GOTO Finished

:Invalid
echo Invalid command (try: make deploy)
GOTO Finished

:Finished