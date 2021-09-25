import { AwsIntegration, LambdaIntegration, PassthroughBehavior, RestApi } from '@aws-cdk/aws-apigateway'
import { Rule, Schedule } from '@aws-cdk/aws-events'
import { LambdaFunction } from '@aws-cdk/aws-events-targets'
import { Role, Policy, Effect, PolicyStatement, ServicePrincipal } from '@aws-cdk/aws-iam'
import { AssetCode, Function, Runtime } from '@aws-cdk/aws-lambda'
import { Queue } from '@aws-cdk/aws-sqs'
import { Aws, Construct, StackProps, CfnOutput, Stack } from '@aws-cdk/core'
import { Duration } from '@aws-cdk/core'
import * as config from '../config.json'
const crypto = require('crypto')

export type TalosConfig = {
  cron?: {
    schedule: string
  }
  webhookUrls?: {
    [key: string]: string
  }
}

export class TalosStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const { cron, webhookUrls }: TalosConfig = config
    const queues: Queue[] = []

    if (!webhookUrls && !Array.isArray(webhookUrls)) {
      throw new Error('Please specify a webhookUrls map in config.json')
    }

    if (!cron?.schedule) {
      throw new Error('Please specify a cron schedule in config.json')
    }

    // API Gateway
    const api = new RestApi(this, `talos-rest-api`, {
      deployOptions: {
        tracingEnabled: true,
      },
    })

    Object.entries(webhookUrls).forEach(([key]) => {
      // SQS
      const messageQueue = new Queue(this, `talos-queue-${key}`)
      queues.push(messageQueue)
    })

    // SQS Policy
    const credentialsRole = new Role(this, 'talos-role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    })

    const policy = new Policy(this, 'talos-send-message-policy', {
      statements: [
        new PolicyStatement({
          actions: ['sqs:SendMessage'],
          effect: Effect.ALLOW,
          resources: queues.map(({ queueArn }) => queueArn),
        }),
      ],
    })

    credentialsRole.attachInlinePolicy(policy)

    Object.entries(webhookUrls).forEach(([key, value], index) => {
      const webhookUriHash = crypto
        .createHash('md5')
        .update(JSON.stringify({ [key]: value }))
        .digest('hex')
      const webook = api.root.addResource(webhookUriHash)
      const queue = queues[index]
      webook.addMethod(
        'POST',
        new AwsIntegration({
          service: 'sqs',
          path: `${Aws.ACCOUNT_ID}/${queue.queueName}`,
          integrationHttpMethod: 'POST',
          options: {
            credentialsRole,
            passthroughBehavior: PassthroughBehavior.NEVER,
            requestParameters: {
              'integration.request.header.Content-Type': `'application/x-www-form-urlencoded'`,
            },
            requestTemplates: {
              'application/json': `Action=SendMessage&MessageBody=$util.urlEncode($input.body)`,
            },
            integrationResponses: [
              {
                statusCode: '200',
                responseTemplates: {
                  'application/json': `{'success': true}`,
                },
              },
            ],
          },
        }),
        { methodResponses: [{ statusCode: '200' }] }
      )

      // Lambda
      const lambdaPolicy = new PolicyStatement()
      lambdaPolicy.addActions('sqs:PurgeQueue', 'sqs:ReceiveMessage')
      lambdaPolicy.addResources(queue.queueArn)

      const lambdaFunction = new Function(this, `talos-sqs-cron-lambda-${key}`, {
        functionName: `talos-sqs-cron-lambda-${key}`,
        handler: 'handler.handler',
        runtime: Runtime.NODEJS_14_X,
        code: new AssetCode(`./lambda`),
        memorySize: 512,
        timeout: Duration.seconds(10),
        initialPolicy: [lambdaPolicy],
        environment: {
          SQS_URL: queue.queueUrl,
          SQS_REGION: Stack.of(this).region,
          WEBHOOK_URL: value,
        },
      })

      webook.addMethod('GET', new LambdaIntegration(lambdaFunction, {}))

      // Cron job
      const rule = new Rule(this, `talos-cron-${key}`, {
        schedule: Schedule.expression(cron.schedule),
      })

      rule.addTarget(new LambdaFunction(lambdaFunction))

      // Outputs
      new CfnOutput(this, `talos-queue-url-${key}`, {
        value: queue.queueUrl,
        description: 'The URL of the SQS queue',
        exportName: `talos-queue-url-${key}`,
      })

      new CfnOutput(this, `talos-webhook-url-${key}`, {
        value: `https://${api.restApiId}.execute-api.${Stack.of(this).region}.amazonaws.com/prod/${webhookUriHash}`,
        description: 'The URL of the API gateway',
        exportName: `talos-webhook-url-${key}`,
      })
    })
  }
}
