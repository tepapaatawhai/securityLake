# securityLake

https://aws.amazon.com/blogs/security/generate-ai-powered-insights-for-amazon-security-lake-using-amazon-sagemaker-studio-and-amazon-bedrock/


![architecture](https://d2908q01vomqb2.cloudfront.net/22d200f8670dbdb3e253a90eee5098477c95c23d/2024/01/12/Generate-AI-powered-insights-1.png)


## Security Lake
#### implemented by /src/stacks/securityLake
1. Enable Security Lake in your organization in AWS Organizations and specify a delegated administrator account to manage the Security Lake configuration for all member accounts in your organization. Configure Security Lake with the appropriate log sources: Amazon Virtual Private Cloud (VPC) Flow Logs, AWS Security Hub, AWS CloudTrail, and Amazon Route53.

1. Create subscriber query access from the source Security Lake AWS account to the subscriber AWS account.

#### 
1. Accept a resource share request in the subscriber AWS account in AWS Resource Access Manager (AWS RAM). (Only if automatic acceptance is not enabled )

1. Create a database link in AWS Lake Formation in the subscriber AWS account and grant access for the Athena tables in the Security Lake AWS account.



## implemented by console access. 
1. Grant Claude v2 model access for Amazon Bedrock LLM Claude v2 in the AWS subscriber account where you will deploy the solution. If you try to use a model before you enable it in your AWS account, you will get an error message.  The claim in the docs is that this is only accessable via the console. 



