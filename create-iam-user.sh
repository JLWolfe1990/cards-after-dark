#!/bin/bash
# Create IAM User for CardsAfterDark using AWS CLI

# AWS credentials should be configured via:
# - AWS CLI: aws configure
# - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# - IAM roles (when running on EC2)
export AWS_DEFAULT_REGION=us-east-1

USERNAME="cards-after-dark-user"
POLICY_NAME="CardsAfterDarkFullAccess"

echo "🚀 Creating IAM user for CardsAfterDark..."

# Step 1: Create IAM user
echo "📝 Creating user: $USERNAME"
aws iam create-user \
  --user-name $USERNAME \
  --tags Key=Project,Value=CardsAfterDark Key=Purpose,Value="Application Backend Services" \
  2>/dev/null || echo "ℹ️  User may already exist, continuing..."

# Step 2: Create policy document
cat > /tmp/cards-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "sns:*",
        "bedrock:*",
        "lambda:*",
        "apigateway:*",
        "cloudformation:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:PassRole",
        "iam:ListRolePolicies",
        "iam:GetRolePolicy",
        "s3:*",
        "logs:*",
        "events:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Step 3: Attach policy
echo "🔒 Attaching policy: $POLICY_NAME"
aws iam put-user-policy \
  --user-name $USERNAME \
  --policy-name $POLICY_NAME \
  --policy-document file:///tmp/cards-policy.json

# Step 4: Create access keys
echo "🔑 Creating access keys..."
KEYS=$(aws iam create-access-key --user-name $USERNAME --output json)

if [ $? -eq 0 ]; then
  ACCESS_KEY_ID=$(echo $KEYS | jq -r '.AccessKey.AccessKeyId')
  SECRET_ACCESS_KEY=$(echo $KEYS | jq -r '.AccessKey.SecretAccessKey')
  
  echo ""
  echo "🎉 IAM User Setup Complete!"
  echo "====================================="
  echo "Username: $USERNAME"
  echo "Access Key ID: $ACCESS_KEY_ID"
  echo "Secret Access Key: $SECRET_ACCESS_KEY"
  echo "====================================="
  
  # Step 5: Update backend .env file
  echo ""
  echo "📝 Updating backend/.env file..."
  
  cat > apps/backend/.env << EOF
# AWS Configuration (CardsAfterDark dedicated user)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY

# Environment
NODE_ENV=development
STAGE=dev

# JWT Secret for local development
JWT_SECRET=dev-secret-change-in-production

# Bedrock AI Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# DynamoDB Tables (created by serverless deployment)
USERS_TABLE=CardsAfterDark-Users-dev
COUPLES_TABLE=CardsAfterDark-Couples-dev
GAME_SESSIONS_TABLE=CardsAfterDark-GameSessions-dev
RATINGS_TABLE=CardsAfterDark-Ratings-dev
INVITATIONS_TABLE=CardsAfterDark-Invitations-dev
VERIFICATION_SESSIONS_TABLE=CardsAfterDark-VerificationSessions-dev
EOF

  echo "✅ Backend .env file updated with new credentials"
  
  # Clean up
  rm -f /tmp/cards-policy.json
  
  echo ""
  echo "🚀 Setup complete! Ready to restart backend with new credentials."
  echo ""
  echo "Next steps:"
  echo "1. Restart your backend server: cd apps/backend && pnpm dev"
  echo "2. Test phone verification with your real number"
  echo "3. Run mobile app: cd apps/mobile && pnpm android"
  
else
  echo "❌ Failed to create access keys"
  echo "This might be because the user already exists with keys"
  echo "You can delete the existing user and try again:"
  echo "aws iam delete-user --user-name $USERNAME"
fi