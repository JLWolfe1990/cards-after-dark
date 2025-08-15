# AWS Configuration for CardsAfterDark Local Testing

## 🔑 Step 1: Configure AWS Credentials

You have several options for setting up AWS credentials:

### Option A: AWS Configure (Recommended)
```bash
aws configure
```
You'll be prompted for:
- **AWS Access Key ID**: Your AWS access key
- **AWS Secret Access Key**: Your AWS secret key  
- **Default region**: `us-east-1` (recommended)
- **Default output format**: `json` (recommended)

### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here
export AWS_DEFAULT_REGION=us-east-1
```

### Option C: Backend .env File
Create `/home/jwolfe/git/cards-after-dark/apps/backend/.env`:
```bash
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
```

## 🏗️ Step 2: Deploy AWS Infrastructure

Once credentials are configured, deploy the backend:

```bash
cd /home/jwolfe/git/cards-after-dark/apps/backend
pnpm deploy
```

This will create:
- DynamoDB tables
- Lambda functions
- API Gateway
- IAM roles and permissions

## 🧪 Step 3: Test Local Backend with AWS Services

```bash
# Start backend on new ports (avoiding 3000/4000)
cd /home/jwolfe/git/cards-after-dark/apps/backend
pnpm dev

# Backend will now run on:
# - HTTP: http://localhost:3001
# - GraphQL: http://localhost:3001/dev/graphql
# - WebSocket: ws://localhost:3003
```

## 📱 Step 4: Configure Mobile App

```bash
cd /home/jwolfe/git/cards-after-dark/apps/mobile

# Copy environment template
cp .env.example .env

# The .env file is already configured for the new ports:
# GRAPHQL_ENDPOINT=http://localhost:3001/dev/graphql
# GRAPHQL_WS_ENDPOINT=ws://localhost:3003
```

## 🎯 Step 5: Full Testing

### Test Backend API:
```bash
# Health check
curl http://localhost:3001/dev/health

# GraphQL Playground
open http://localhost:3001/dev/graphql
```

### Test Phone Verification:
```graphql
mutation {
  sendPhoneVerification(phoneNumber: "+1YOUR_PHONE_NUMBER") {
    sessionId
    message
  }
}
```

### Test Mobile App:
```bash
cd apps/mobile
pnpm android  # or pnpm ios
```

## 🔍 Troubleshooting

### "AWS credentials not found":
- Run `aws configure list` to check configuration
- Ensure your IAM user has the necessary permissions:
  - DynamoDB full access
  - SNS publish permissions
  - Bedrock invoke permissions
  - Lambda execution role

### "DynamoDB table not found":
- Make sure you've deployed: `pnpm deploy`
- Check AWS console that tables were created
- Verify region matches (us-east-1)

### "SMS not sending":
- Check SNS permissions in IAM
- Verify phone number format: `+1XXXXXXXXXX`
- Some regions require phone number verification

### "Bedrock access denied":
- Ensure Bedrock is enabled in your AWS account
- Check that Claude models are available in us-east-1
- Verify IAM permissions for bedrock:InvokeModel

## 📋 Required AWS Permissions

Your IAM user/role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:*",
                "sns:Publish",
                "bedrock:InvokeModel",
                "lambda:*",
                "apigateway:*",
                "iam:*",
                "cloudformation:*",
                "s3:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🚀 Next Steps

Once AWS is configured and working:

1. **Test complete authentication flow**
2. **Verify SMS sending to your phone**
3. **Test AI card generation with Bedrock**
4. **Run mobile app and connect to local backend**
5. **Test real-time features between devices**

---

**Port Configuration:**
- Backend HTTP: `localhost:3001`
- Backend Lambda: `localhost:3002`  
- Backend WebSocket: `localhost:3003`
- GraphQL Playground: `http://localhost:3001/dev/graphql`