
deploy:
	@aws cloudformation package \
	--template-file stack.yaml \
	--output-template-file serverless-output.yaml \
	--s3-bucket kehoro-tmp

	@aws cloudformation deploy --template-file serverless-output.yaml \
	--stack-name kehoro-test-stack \
	--parameter-overrides NotificationEmail=robert.kehoe@f-secure.com \
	--capabilities CAPABILITY_IAM