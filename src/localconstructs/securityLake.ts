import * as core from 'aws-cdk-lib';
import * as constructs from 'constructs';
import * as path from 'path';
import {
    aws_securitylake as securityLake,
    aws_kms as kms,
    aws_iam as iam,
    custom_resources as cr,
    aws_lambda as lambda,
    aws_logs as logs,

} from 'aws-cdk-lib'

export enum AwsSource {
  ROUTE_53 = 'ROUTE53',
  VPC_FLOW = 'VPC_FLOW',
  SECURITY_HUB = 'SH_FINDINGS',
  CLOUD_TRAIL_MGMT = 'CLOUD_TRAIL_MGMT',
  LAMBDA = 'LAMBDA_EXECUTION',
  S3_DATA = 'S3_DATA',
  EKS_AUDIT = 'EKS_AUDIT',
}

export enum SecurityLakeStorageClass {
  STANDARD_IA = 'STANDARD_IA',
  ONEZONE_IA = 'ONEZONE_IA',
  INTELLIGENT_TIERING = 'INTELLIGENT_TIERING',
  GLACIER_IR = 'GLACIER_IR',
  GLACIER = 'GLACIER',
  DEEP_ARCHIVE = 'DEEP_ARCHIVE',
  EXPIRE = 'EXPIRE',
}

interface AwsLogSource {
  accounts?: core.Environment[] | undefined,
  source: AwsSource,
  sourceVersion?: string | undefined,
}

interface AddAwsSourceProps {
  logSources: AwsLogSource[]
}

export interface Transistion {
  period: core.Duration,
  class: SecurityLakeStorageClass,
}

export interface SecurityLakeProps extends core.StackProps {
  key: kms.IKey
  lifecycle: string
}

export class SecurityLake extends constructs.Construct {

  arn: string
  //bucket: s3.IBucket

  constructor(scope: constructs.Construct, id: string, props: SecurityLakeProps) {
    super(scope, id);

    let encryptionConfig: securityLake.CfnDataLake.EncryptionConfigurationProperty =  {
      kmsKeyId: props.key.keyId
      }
    
    const metaStoreRole = new iam.Role(this,'MetaStoreRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })
    metaStoreRole.addManagedPolicy(
      iam.ManagedPolicy.fromManagedPolicyArn(this, 'metastorepolicy',
        'arn:aws:iam::aws:policy/service-role/AmazonSecurityLakeMetastoreManager'
      )
    )

    const securityLakeEvent = new lambda.Function(this, 'SecurityLakeLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset(path.join(__dirname,'../../assets/lambda/securitylake/')),
      timeout: core.Duration.seconds(60),
      handler: 'security_lake.on_event'
    });

    securityLakeEvent.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'securitylake:*',
        'iam:PassRole',
        'iam:ListAttachedRolePolicies',
        's3:*',
        'lambda:*',
        'sqs:*',
        'events:*',
        'lakeformation:*',
        '*', // THIS IS OVERPROVISIONED, BUT ITS NOT CLEAR WHAT PERMISSIONS THIS NEEDS!,  'eventId: 1f33d582-0448-44e1-b908-9864ea343972'
        /**
         * message": "To perform this operation, your account must be a delegated Security Lake administrator account or a standalone Security Lake account."
         */
       ],
      resources: ['*']
    }))

    securityLakeEvent.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "kms:CreateGrant",
        "kms:DescribeKey",
        "kms:GenerateDataKey",
        "kms:Decrypt",
       ],
      resources: [props.key.keyArn]
    }))

    const securityLakeIsComplete = new lambda.Function(this, 'IsCompleteLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset(path.join(__dirname,'../../assets/lambda/securitylake/')),
      timeout: core.Duration.seconds(60),
      handler: 'security_lake.is_complete'
    });

    securityLakeIsComplete.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['securitylake:ListDataLakes'],
      resources: ['*']
    }))

    const SecurityLakeProvider = new cr.Provider(this, 'MyProvider', {
      onEventHandler: securityLakeEvent,
      isCompleteHandler: securityLakeIsComplete,
      queryInterval: core.Duration.seconds(30),
      totalTimeout: core.Duration.minutes(60),
      logGroup: new logs.LogGroup(this, 'MyProviderLogs', {
        retention: logs.RetentionDays.FIVE_DAYS,
      }),
    });

    
    const securityLake = new core.CustomResource(this, 'Resource', {
      serviceToken: SecurityLakeProvider.serviceToken,
      properties: {
        encryptionConfiguration: encryptionConfig,
        lifecycleConfiguration: props.lifecycle,
        region: core.Aws.REGION,
        metaStoreManagerRoleArn: metaStoreRole.roleArn
      }
    })

   
    this.arn = securityLake.getAttString('Arn')
    //this.bucket = s3.Bucket.fromBucketArn(this, 'lakebucket', securityLake.getAttString('BucketArn'));

  }



  public addAwsSource(props: AddAwsSourceProps): void {

    let lastSource: securityLake.CfnAwsLogSource | undefined = undefined
    props.logSources.forEach((source) => {

      let accounts: string[] | undefined
      if (source.accounts) {
        accounts = source.accounts.map((env) => {
          return env.account as string;
        })
      }

      
      let nextsource = new securityLake.CfnAwsLogSource(this, `${source.source}-AwsLogSource`, {
        dataLakeArn: this.arn,
        sourceName: source.source,
        sourceVersion: source.sourceVersion ?? '2.0',
        accounts: accounts
      });

      // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-securitylake-awslogsource.html#aws-resource-securitylake-awslogsource--examples
      // f you want to create multiple sources using AWS::SecurityLake::AwsLogSource, you must use the DependsOn attribute to create the sources sequentially. With the DependsOn attribute you can specify that the creation of a specific AWSLogSourcefollows another. When you add a DependsOn attribute to a resource, that resource is created only after the creation of the resource specified in the DependsOn attribute. For an example, see Add AWS log sources.
      if (lastSource) {
        nextsource.addDependency(lastSource)
      }

      lastSource = nextsource
    
    })
  } 

}
