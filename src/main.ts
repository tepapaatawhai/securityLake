import { App } from 'aws-cdk-lib';
import * as environments from './pipeline/environments';
import { Pipeline } from './pipeline/pipeline';

const app = new App();

new Pipeline(app, 'pj-codepipeline', {
  env: environments.deploy,
  repo: 'thing/thing2',
  branch: 'main',
  codestarArn: 'arn:xxxaaaa',
});

app.synth();