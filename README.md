# Lambda Page Scanner

A "page scanner" application that will periodically query a web page, and compare to previous version 
and send a notification if there has been any additions.

Example Use Cases:
 - Monitor an RSS feed for new items
 - Monitor a blog for new posts
 - Monitor a subreddit for new topics

The application is powered using AWS Lambda, DynamoDB, S3 and CloudFormation. 

Note: application does use S3 to upload the change sets/packages. 
Clear out bucket regularly to avoid charges (although S3 is probably the cheapest AWS service).


# How to Install

As long as you have the prerequitests installed it is trival to get started. You can either clone 
this project from GitHub or download the archive and extract somewhere on your local disk

### Prerequitests

- Have an Amzon AWS account
- AWS CLI tool installed
- Have configured the AWS CLI tool (i.e. already run `aws configure`)
- Have an Amazon S3 bucket already created

The installation of the AWS CLI tool is covered in great depth on the 
[Installing the AWS Command Line Interface](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and the 
[Configuring the AWS Command Line Interface](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).

## Configuration

You will need to modify the lambda function slightly to match your needs, in your code editor edit the file
`lambda/index.js`. Change the variables at the top as needed.

In addition there is some OS specific stuff that will need to be done.

### Windows Users

Edit the `make.bat` file and change the vairables at the top as required

### Linux / Mac Users

Edit the `Makefile` file and change the vairables at the top as required

You are now ready to begine the installation.

## Installation

### Windows & Linux/Mac

Installation instrutions are identical for all OS's, 

- Git clone this repo or download the archive and extract
- Configure settings as described above
- Open a command line window / bash terminal
- Goto the directory where the project files are located
- run the command: `make deploy` (this is the same for both Windows and Linux users)

NOTE: The first time you deploy the application Amazon will send you a confirmation email 
asking you to confirm your subscription, you __must__ click the link to confirm, otherwise 
AWS will not send you and more emails.
