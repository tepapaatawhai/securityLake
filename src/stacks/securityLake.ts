import * as core from 'aws-cdk-lib';
import * as constructs from 'constructs';

// import {
//   aws_kms as kms,
// } from 'aws-cdk-lib'

import * as securityLake from '../localconstructs/securityLake'
import * as environments from '../pipeline/environments'


export interface SecurityLakeProps extends core.StackProps {
  name: string;
  shareExternalId: string;
}

export class SecurityLake extends core.Stack {

  constructor(scope: constructs.Construct, id: string, props: SecurityLakeProps) {
    super(scope, id, props);

    // this will just deploy in the region that it 
    const depconLake = new securityLake.SecurityLake(this, 'securityLake', {
      // key: new kms.Key(this, 'kms', {
      //   description: 'Key To encrypt, securityLake'
      // }),
      lifecycle: JSON.stringify({
        expiration: {
          "days": 1825
        },
        transitions: [
          {
            days: 30,
            storageClass: securityLake.SecurityLakeStorageClass.INTELLIGENT_TIERING,
          },
          {
            days: 365,
            storageClass: securityLake.SecurityLakeStorageClass.GLACIER,
          },
        ],
      }),
    })

    depconLake.addAwsSource({
      logSources: [
        {
          source: securityLake.AwsSource.VPC_FLOW,
          sourceVersion: '2.0'
        },
        {
          source: securityLake.AwsSource.ROUTE_53,
          sourceVersion: '2.0'
        },
        {
          source: securityLake.AwsSource.SECURITY_HUB,
          sourceVersion: '2.0'
        },
        {
          source: securityLake.AwsSource.CLOUD_TRAIL_MGMT,
          sourceVersion: '2.0'
        },
      ]
    })

    depconLake.addSubscriber(
      'AIanalyst',
      'Claude Bedrock AI Analysis of Logs',
      {
        accessTypes: [securityLake.AccessType.LAKEFORMATION],
        awsLogSources: [
          {source: securityLake.AwsSource.CLOUD_TRAIL_MGMT },
          {source: securityLake.AwsSource.ROUTE_53 },
          {source: securityLake.AwsSource.SECURITY_HUB },
          {source: securityLake.AwsSource.VPC_FLOW },
        ],
        identity: {
          principal: environments.analyst.account!,
          externalId: props.shareExternalId,
        }
      } 
    )

  }
}