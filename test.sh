#!/bin/bash
# Quick Test Script for CardsAfterDark

echo "🚀 CardsAfterDark Testing Suite"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the root of the CardsAfterDark project"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
pnpm install --silent

# Test backend compilation
echo "🔧 Testing backend compilation..."
cd apps/backend
if pnpm build; then
    echo "✅ Backend builds successfully"
else
    echo "❌ Backend build failed"
    exit 1
fi
cd ../..

# Test mobile app compilation (React Native)
echo "📱 Testing mobile app compilation..."
cd apps/mobile
if pnpm install --silent; then
    echo "✅ Mobile dependencies installed"
else
    echo "❌ Mobile dependency installation failed"
    exit 1
fi

# Check for required files
echo "📋 Checking configuration files..."

if [ -f "apps/backend/serverless.yml" ]; then
    echo "✅ Backend serverless config found"
else
    echo "❌ Backend serverless config missing"
fi

if [ -f "apps/mobile/package.json" ]; then
    echo "✅ Mobile package.json found"
else
    echo "❌ Mobile package.json missing"
fi

if [ -f "apps/mobile/.env.example" ]; then
    echo "✅ Mobile environment template found"
else
    echo "❌ Mobile environment template missing"
fi

cd ../..

echo ""
echo "🧪 Ready for testing! Choose your testing approach:"
echo ""
echo "1. 🖥️  Backend Only Testing:"
echo "   cd apps/backend && pnpm dev"
echo "   Visit http://localhost:4000/graphql"
echo ""
echo "2. 📱 Mobile App Testing:"
echo "   cd apps/mobile"
echo "   cp .env.example .env  # Edit with your API endpoints"
echo "   pnpm android  # or pnpm ios"
echo ""
echo "3. 🔗 Integration Testing:"
echo "   node test-integration.js"
echo ""
echo "4. 🎯 Full End-to-End:"
echo "   See test-mobile.md for complete testing guide"
echo ""
echo "📚 Testing Documentation:"
echo "   • test-backend.md - Backend API testing"
echo "   • test-mobile.md - Mobile app testing"  
echo "   • test-integration.js - Automated integration tests"