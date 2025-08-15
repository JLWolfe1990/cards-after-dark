#!/usr/bin/env node
/**
 * Create IAM User for CardsAfterDark
 * This script creates a new IAM user with full privileges for the CardsAfterDark application
 */

const AWS = require('aws-sdk');

// Configure AWS with credentials from environment variables or AWS profile
AWS.config.update({
  region: 'us-east-1'
});

const iam = new AWS.IAM();

const USERNAME = 'cards-after-dark-user';
const POLICY_NAME = 'CardsAfterDarkFullAccess';

// Policy document with all necessary permissions
const POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        // DynamoDB - Full access
        'dynamodb:*',
        
        // SNS - For SMS notifications
        'sns:*',
        
        // Bedrock - For AI card generation
        'bedrock:*',
        
        // Lambda - For serverless functions
        'lambda:*',
        
        // API Gateway - For REST endpoints
        'apigateway:*',
        
        // CloudFormation - For serverless deployments
        'cloudformation:*',
        
        // IAM - For role management
        'iam:CreateRole',
        'iam:DeleteRole',
        'iam:AttachRolePolicy',
        'iam:DetachRolePolicy',
        'iam:PutRolePolicy',
        'iam:DeleteRolePolicy',
        'iam:GetRole',
        'iam:PassRole',
        'iam:ListRolePolicies',
        'iam:GetRolePolicy',
        
        // S3 - For deployment artifacts
        's3:*',
        
        // CloudWatch - For logging
        'logs:*',
        
        // Events - For scheduled functions
        'events:*'
      ],
      Resource: '*'
    }
  ]
};

async function createIAMUser() {
  try {
    console.log('🚀 Creating IAM user for CardsAfterDark...');
    
    // Step 1: Create IAM user
    console.log(`📝 Creating user: ${USERNAME}`);
    try {
      await iam.createUser({
        UserName: USERNAME,
        Tags: [
          {
            Key: 'Project',
            Value: 'CardsAfterDark'
          },
          {
            Key: 'Purpose',
            Value: 'Application Backend Services'
          }
        ]
      }).promise();
      console.log('✅ User created successfully');
    } catch (error) {
      if (error.code === 'EntityAlreadyExists') {
        console.log('ℹ️  User already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Create and attach inline policy
    console.log(`🔒 Attaching policy: ${POLICY_NAME}`);
    await iam.putUserPolicy({
      UserName: USERNAME,
      PolicyName: POLICY_NAME,
      PolicyDocument: JSON.stringify(POLICY_DOCUMENT, null, 2)
    }).promise();
    console.log('✅ Policy attached successfully');

    // Step 3: Create access keys
    console.log('🔑 Creating access keys...');
    const accessKeyResult = await iam.createAccessKey({
      UserName: USERNAME
    }).promise();

    const accessKey = accessKeyResult.AccessKey;
    
    console.log('\n🎉 IAM User Setup Complete!');
    console.log('=====================================');
    console.log(`Username: ${USERNAME}`);
    console.log(`Access Key ID: ${accessKey.AccessKeyId}`);
    console.log(`Secret Access Key: ${accessKey.SecretAccessKey}`);
    console.log('=====================================');
    
    console.log('\n📝 Next steps:');
    console.log('1. Save these credentials securely');
    console.log('2. Update your backend/.env file');
    console.log('3. Test the application');
    
    // Return credentials for automated setup
    return {
      accessKeyId: accessKey.AccessKeyId,
      secretAccessKey: accessKey.SecretAccessKey
    };
    
  } catch (error) {
    console.error('❌ Error creating IAM user:', error.message);
    
    if (error.code === 'AccessDenied') {
      console.error('⚠️  The current AWS credentials do not have permission to create IAM users.');
      console.error('   Please ensure your AWS user has IAM permissions or create the user manually.');
    }
    
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createIAMUser()
    .then((credentials) => {
      console.log('\n✨ Setup complete! CardsAfterDark IAM user is ready.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createIAMUser };