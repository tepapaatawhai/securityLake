import { CDKPipelineApp } from 'pj-codepipeline';
const project = new CDKPipelineApp({
  cdkVersion: '2.139.0',
  defaultReleaseBranch: 'main',
  devDeps: ['pj-codepipeline'],
  name: 'securityLake',
  projenrcTs: true,

  deps: ['cdk-nag'],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.addGitIgnore('!/projectAssets/**')

project.synth();