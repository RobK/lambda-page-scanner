NOTIFICATION_EMAIL=cherrio@gmail.com
BUCKET_NAME=kehoro-tmp-scanner
CRONSCHEDULE=5 6-16 ? * * *

deploy:
	@cd lambda
	@rm -rf node_modules
	@npm install --production
	@cd ..
	@aws cloudformation package \
	--template-file stack.yaml \
	--output-template-file serverless-output.yaml \
	--s3-bucket $BUCKET_NAME

	@aws cloudformation deploy --template-file serverless-output.yaml \
	--stack-name lambda-page-scanner \
	--parameter-overrides NotificationEmail=$NOTIFICATION_EMAIL \
	--parameter-overrides "CronSchedule=$CRONSCHEDULE" \
	--capabilities CAPABILITY_IAM