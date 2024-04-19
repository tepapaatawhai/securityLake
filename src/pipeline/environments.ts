import * as core from 'aws-cdk-lib';
export const dev: core.Environment = {
  account: '22222222222',
  region: 'ap-southeast-2',
};

export const deploy: core.Environment = {
  account: '111111111111',
  region: 'ap-southeast-2',
};
