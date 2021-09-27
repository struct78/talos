# Talos
## A webhook debouncer

This project was created to limit the number webhook calls made to our Gatsby Cloud build webhooks from our Sanity content management system, so we could reduce the number of builds occuring but still have our site updated regularly. We noticed that due to a large number of editors rapidly making changes, and a number of automated sync tasks, that we were triggering a lot of unnecessary builds.

NOTE: This project is only useful if the contents of the webhook payload aren't terribly important, as the Lambda will only send a single payload from SQS (FIFO).

## Prerequisites
You will need to have the [AWS CLI](https://aws.amazon.com/cli/) installed.
## Get Started
First install the AWS CDK globally.

`yarn global add aws-cdk` 
or 
`npm i -g aws-cdk`

Then configure your environment.

`aws configure`

If you haven't used CDK before, you will need to bootstrap CDK.

`cdk bootstrap aws://{ACCOUNT-NUMBER}/{REGION}` or `cdk bootstrap --profile default`

Now install the dependencies.

`yarn install`

#### Configuration
Create a file called `config.json` based on `config.example.json`. Set the cron schedule, and webhook URLs.

##### cron.schedule
A cron expression, refer to the [AWS Schedule expressions using rate or cron](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html)

##### webhookUrls
A set of key/value pairs. The key is used when naming the AWS resources, and the value is the URL of the webhook you want to call.

```
{
  "cron": {
    "schedule": "cron(0/15 * * * ? *)"
  },
  "webhookUrls": {
    "production": "https://webhook.url/webhook/cdb45bf4-99b0-46bc-bdbc-20579c03822b",
    "staging": "https://webhook.url/webhook/4d6b1f8f-f738-458e-83d1-1c2d586dfafa"
  }
}
```

### How it works
Once deployed, it will output API Gateway URL(s) which act as proxy links for your webhook(s). These webhooks publish messages to an SQS queue. A Lambda function is then set to run every 15 minutes (or whatever cron interval you choose), if there are messages in the queue it will call the webhook URL specified in your config. If it is empty, it does nothing. It will then purge the queue.

##### Diagram
![](https://i.imgur.com/DZJQvr0.jpeg)

## Commands

 * `yarn build`   compile typescript to js
 * `yarn watch`   watch for changes and compile
 * `yarn test`    perform the jest unit tests
 * `yarn deploy`  build and deploy your stack
