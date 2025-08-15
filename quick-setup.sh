#!/bin/bash
# Quick Setup Script for CardsAfterDark Local Testing

echo "🚀 CardsAfterDark - AWS & Local Setup"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the root of the CardsAfterDark project"
    exit 1
fi

echo "📋 Step 1: Check AWS Configuration"
if aws configure list | grep -q "not set"; then
    echo "⚠️  AWS credentials not configured"
    echo "Please run: aws configure"
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region: us-east-1"
    echo "  - Default output: json"
    echo ""
    read -p "Press Enter after configuring AWS credentials..."
fi

echo "✅ AWS credentials configured"
aws configure list

echo ""
echo "📦 Step 2: Install Dependencies"
pnpm install

echo ""
echo "🔧 Step 3: Build Packages"
pnpm build

echo ""
echo "🚀 Step 4: Deploy AWS Infrastructure (Optional)"
read -p "Deploy to AWS? This will create DynamoDB tables, Lambda functions, etc. (y/N): " deploy_aws
if [[ $deploy_aws =~ ^[Yy]$ ]]; then
    cd apps/backend
    echo "Deploying to AWS..."
    pnpm deploy
    cd ../..
    echo "✅ AWS deployment complete"
else
    echo "⏭️  Skipping AWS deployment"
fi

echo ""
echo "📱 Step 5: Setup Mobile Environment"
cd apps/mobile
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created mobile .env file with local backend URLs"
else
    echo "✅ Mobile .env file already exists"
fi
cd ../..

echo ""
echo "🎯 Setup Complete! Ready to test:"
echo ""
echo "🖥️  Start Backend Server:"
echo "   cd apps/backend && pnpm dev"
echo "   Backend will run on http://localhost:3001"
echo "   GraphQL Playground: http://localhost:3001/dev/graphql"
echo ""
echo "📱 Start Mobile App:"
echo "   cd apps/mobile && pnpm android  # or pnpm ios"
echo ""
echo "🧪 Test Backend API:"
echo "   curl http://localhost:3001/dev/health"
echo ""
echo "📚 See AWS_SETUP.md for detailed configuration help"