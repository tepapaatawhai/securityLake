import * as core from 'aws-cdk-lib';
import * as constructs from 'constructs';

import {
  aws_kms as kms
} from 'aws-cdk-lib'

import * as securityLake from '../localconstructs/securityLake'
import * as environments from '../pipeline/environments'


export interface AIanalystProps extends core.StackProps {
  name: string;
  shareExternalId: string;
}

export class AIanalyst extends core.Stack {

  constructor(scope: constructs.Construct, id: string, props: AIanalystProps) {
    super(scope, id, props);

    //Grant Claude v2 model access for Amazon Bedrock LLM Claude v2 in the AWS subscriber
     account where you will deploy the solution. If you try to use a model before you enable 
    t in your AWS account, you will get an error message.

  }
}