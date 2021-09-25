# Talos
## A webhook debouncer

This project was created to limit the number webhook calls made to Gatsby JS from our Sanity content management system, so we could reduce the number of builds occuring but still have our site updated regularly.

## Get Started
First install the AWS CDK and AWS SDK globally.

`yarn global add aws-sdk aws-cdk` 
or 
`npm i -g aws-sdk aws-cdk`

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

## Useful commands

 * `yarn build`   compile typescript to js
 * `yarn watch`   watch for changes and compile
 * `yarn test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
