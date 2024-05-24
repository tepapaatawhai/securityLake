import * as core from 'aws-cdk-lib';
import * as constructs from 'constructs';

import {
  aws_iam as iam,
  aws_opensearchserverless as oss,
  aws_s3 as s3
} from 'aws-cdk-lib'

export enum OssType {
  SEARCH = 'SEARCH',
  TIMESERIES = 'TIMESERIES',
  VECTORSEARCH = 'VECTORSEARCH'
}

export enum SecurityPolicyType {
  ENCRYPTION = 'encryption',
  NETWORK = 'network'
}

export enum AccessPolicyType {
  DATA = 'data',
}

export enum ResourceType {
  COLLECTION = 'collection',
  DASHBOARD = 'dashboard',
  INDEX = 'index',
}

export interface RagProps extends core.StackProps {
  name: string;
  description: string;
  content?: s3.IBucket | undefined;
}

export class Rag extends constructs.Construct {

  
  constructor(scope: constructs.Construct, id: string, props: RagProps) {
    super(scope, id);

    if (props.name.length > 16) {
      throw Error('The name property must be less than 16 characters')
    } 

    // content bucket
    let content: s3.IBucket
    if (props.content) {
        content = props.content
    }
    else {
        content = new s3.Bucket(this, 'contentBucketforRAG', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
            //TOdo: add a lifecycle policy
        })
    }

    // role for bedrock execution
    const bedRockRole = new iam.Role(this, 'bedRockRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com')
    });

    bedRockRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      effect: iam.Effect.ALLOW,
      resources: [
        `arn:${core.Aws.PARTITION}:bedrock:${core.Aws.REGION}::foundation-model/amazon.anthropic.claude-3-sonnet-20240229-v1:0`
      ]
    }))

    bedRockRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:ListObject',
      ],
      effect: iam.Effect.ALLOW,
      resources: [
        `${content.bucketArn}/*`,
        `${content.bucketArn}`
      ]
    }))

    // role for cdk execution
    const cdkExecRole = iam.Role.fromRoleArn(this, 'cdkExecRole',
     'arn:aws:iam::905418030157:role/cdk-hnb659fds-cfn-exec-role-905418030157-ap-southeast-2'
    );

    const collection = new oss.CfnCollection(this, 'Collection', {
      name: props.name,
      description: props.description,
      type: OssType.VECTORSEARCH,
    })

    const networkPolicy = new oss.CfnSecurityPolicy(this, 'NetworkSecurityPolicy', {
      policy: JSON.stringify([{
        Rules: [
          {
            ResourceType: ResourceType.COLLECTION,
            Resource: [ `collection/${props.name}` ]
          },
        ],
        AllowFromPublic: true
      }]),
      type: SecurityPolicyType.NETWORK,
      name: `${props.name}-networkPolicy`
    })

    new oss.CfnSecurityPolicy(this, 'NetworkSecurityPolicy', {
      policy: JSON.stringify([{
        Rules: [
          {
            ResourceType: ResourceType.COLLECTION,
            Resource: [ `collection/${props.name}` ]
          },
        ],
        AWSOwnedKey: true,
      }]),
      type: SecurityPolicyType.ENCRYPTION,
      name: `${props.name}-encryptionPolicy`
    })

    new oss.CfnAccessPolicy(this, 'AccessPolicy', {
      name: `${props.name}-accessPolicy`,
      type: AccessPolicyType.DATA,
      policy: JSON.stringify(
        [
          {
            Rules: [
              {
                Resource: [`collection/${props.name}`],
                Permission: [
                  'aoss:CreateCollectionItems',
                  'aoss:DeleteCollectionItems',
                  'aoss:UpdateCollectionItems',
                  'aoss:DescribeCollectionItems'
                ],
                ResourceType: ResourceType.COLLECTION,
                },
                {
                  'Resource': [`index/${props.name}/*`],
                  'Permission': [
                    'aoss:CreateIndex',
                    'aoss:DeleteIndex',
                    'aoss:UpdateIndex',
                    'aoss:DescribeIndex',
                    'aoss:ReadDocument',
                    'aoss:WriteDocument'
                  ],
                  'ResourceType': ResourceType.INDEX,
                }
              ],
            'Principal': [
              bedRockRole.roleArn,
              cdkExecRole.roleArn,
            ],
            'Description': 'Easy data policy'}
      ])
    })

  
    bedRockRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'aoss:APIAccessAll',
      ],
      effect: iam.Effect.ALLOW,
      resources: [
        `arn:${core.Aws.PARTITION}:aoss:${core.Aws.REGION}:${core.Aws.ACCOUNT_ID}:collection/${collection.attrId}`
      ]
    })  )

  }
}
