NOTIFICATION_EMAIL=youemail@test.com
BUCKET_NAME=your-bucket-name
# Every hour, at 5 past the hour, between 6 and 16 (UTC time), every day of the week, every month
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