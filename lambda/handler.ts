import { ReceiveMessageCommand, PurgeQueueCommand, SQSClient } from '@aws-sdk/client-sqs'
import axios from 'axios'

const handler = async function (event: any, context: any) {
  try {
    const queueUrl = process.env.SQS_URL
    const webhookUrl = process.env.WEBHOOK_URL
    const client = new SQSClient({ region: process.env.SQS_REGION })
    const params = {
      AttributeNames: ['SentTimestamp'],
      MaxNumberOfMessages: 10,
      MessageAttributeNames: ['All'],
      QueueUrl: queueUrl,
      VisibilityTimeout: 20,
      WaitTimeSeconds: 0,
    }

    if (!webhookUrl) {
      return {
        statusCode: 500,
        headers: {},
        body: {
          error: 'Webhook URL not specified',
        },
      }
    }

    try {
      const data = await client.send(new ReceiveMessageCommand(params))

      if (data.Messages) {
        const body = data.Messages[0].Body
        await axios.post(webhookUrl, )
        await client.send(
          new PurgeQueueCommand({
            QueueUrl: queueUrl,
          })
        )
      }

      return {
        statusCode: 200,
        headers: {},
        body: {
          messages: data.Messages?.length || 0,
        },
      }
    } catch (err) {
      return {
        statusCode: 500,
        headers: {},
        body: {
          queueUrl,
          error: err,
        },
      }
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: {},
      body: {
        error: err,
      },
    }
  }
}

export { handler }
