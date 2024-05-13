import * as cdk from 'aws-cdk-lib';
import {
  pipelines,
}
  from 'aws-cdk-lib';

import * as constructs from 'constructs';
import * as environments from './environments';
import { SecurityLake } from '../stacks/securityLake';
import { SageMakerDomainStack } from '../stacks/sagemakerDomain'

const sharingID = 'FREDFLINTSTONE';

export interface PipelineProps extends cdk.StackProps{
  repo: string;
  branch: string;
  codestarArn: string;
}

export class Pipeline extends cdk.Stack {

  constructor(scope: constructs.Construct, id: string, props: PipelineProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      selfMutation: true,
      dockerEnabledForSelfMutation: true,
      dockerEnabledForSynth: true, // we need this to bundle the lambdas with requirements

      synth: new pipelines.ShellStep('Synth', {

        // Use a connection created using the AWS console to authenticate to GitHub
        // Other sources are available.
        input: pipelines.CodePipelineSource.connection(
          props.repo,
          props.branch,
          { connectionArn: props.codestarArn },
        ),
        commands: [
          'yarn install',
          'yarn build',
          'npx cdk synth',
        ],
      }),
    });

    pipeline.addStage(
      new SecurityLakeStage(this, 'prod', {
        env: environments.lake,
      }),
    );
  }
}

class SecurityLakeStage extends cdk.Stage {
  constructor(scope: constructs.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new SecurityLake(this, 'SecurityLake', {
      env: environments.lake,
      name: 'securityLake',
      shareExternalId: sharingID // funny reference to bedrock
    });

    new SageMakerDomainStack(this, 'SageMakerDomain', {
      env: environments.analyst,
      presumptionRole: 'arn:aws:iam::381491951558:role/aws-reserved/sso.amazonaws.com/ap-southeast-2/AWSReservedSSO_ApplicationAdministrator_803b45237bd6b8b6',
      restrictSageMakerIP: '0.0.0.0/0',
    })
  }
};