import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import * as Cdk from '../lib/cdk-stack'

test('Stack is correct', () => {
  const app = new cdk.App()
  const stack = new Cdk.TalosStack(app, 'TalosTestStack')

  expectCDK(stack).to(haveResource("AWS::SQS::Queue"))
  expectCDK(stack).to(haveResource("AWS::ApiGateway::Method"))
  expectCDK(stack).to(haveResource("AWS::Lambda::Function"))
})
