# 🧪 CardsAfterDark - Complete Testing Guide

## ✅ Current Status: Backend Running Successfully!

The backend server is currently running at `http://localhost:3000` and responding to health checks.

## 🎯 Step-by-Step Testing Process

### **Phase 1: Backend API Testing (✅ WORKING)**

#### Test the GraphQL Playground:
1. **Visit GraphQL Playground:** Open http://localhost:3000/dev/graphql in your browser
2. **Test Health Check:**
   ```graphql
   query {
     healthCheck
   }
   ```

#### Test Phone Verification:
```graphql
mutation {
  sendVerificationCode(phoneNumber: "+15551234567") {
    sessionId
    message
  }
}
```

#### Test User Registration:
```graphql
mutation {
  verifyCode(
    sessionId: "your_session_id_from_above"
    code: "123456"
    firstName: "Alice"
    lastName: "Smith"
  ) {
    token
    user {
      id
      firstName
      lastName
      phoneNumber
      isVerified
    }
  }
}
```

### **Phase 2: Mobile App Testing**

#### Setup Mobile Environment:
```bash
cd apps/mobile

# Copy environment template
cp .env.example .env

# Edit .env file with local backend URL:
GRAPHQL_ENDPOINT=http://localhost:3000/dev/graphql
GRAPHQL_WS_ENDPOINT=ws://localhost:3000/dev

# Install dependencies
pnpm install
```

#### Run Mobile App:
```bash
# For Android (requires Android Studio):
pnpm android

# For iOS (requires macOS + Xcode):
pnpm ios

# Start Metro bundler separately if needed:
pnpm start
```

### **Phase 3: End-to-End User Flow Testing**

#### 🧪 **Single User Test Flow:**

1. **Launch Mobile App**
   - App opens to phone input screen
   - Enter test phone number: `(555) 123-4567`

2. **Phone Verification**
   - SMS code sent (check backend logs)
   - Enter verification code: `123456`
   - Proceed to next screen

3. **User Registration**
   - Enter first name: "Alice"
   - Enter last name: "Smith"
   - Create account successfully

4. **Partner Invitation Screen**
   - Either invite partner or skip for now
   - Access main app

5. **Game Interface**
   - Navigate to game tab
   - See "Draw Card" button
   - Test card drawing functionality

#### 🤝 **Couple Testing Flow:**

**Requirements:** Two devices or simulators

1. **User A (First Partner):**
   - Complete registration as "Alice Smith"
   - Phone: `(555) 123-4567`
   - Invite partner with phone: `(555) 987-6543`

2. **User B (Second Partner):**
   - Complete registration as "Bob Johnson"
   - Phone: `(555) 987-6543`
   - Accept invitation from Alice

3. **Couple Gameplay:**
   - Both users draw cards
   - Vote on preferred card
   - Complete activity together
   - Rate experience

### **Phase 4: Real-time Testing**

#### Test Partner Synchronization:
1. **Open app on both devices**
2. **User A draws card** → User B sees notification
3. **User B draws card** → Both see voting options
4. **Both users vote** → Selected card revealed
5. **Complete activity** → Points awarded to both

### **Phase 5: Push Notification Testing**

#### Setup Firebase (Required):
1. Create Firebase project
2. Add `google-services.json` to `android/app/`
3. Add `GoogleService-Info.plist` to `ios/CardsAfterDark/`
4. Update `.env` with Firebase config

#### Test Notifications:
1. **Grant notification permissions**
2. **Test daily reminders** (7 PM notifications)
3. **Test partner activity alerts**
4. **Test invitation notifications**

## 🐛 Common Issues & Solutions

### Backend Issues:

**"ENOENT: schema.graphql not found"**
```bash
# Fix: Copy schema file to dist
mkdir -p packages/graphql-schema/dist/schema
cp packages/graphql-schema/src/schema/schema.graphql packages/graphql-schema/dist/schema/
```

**"AWS credentials not found"**
- Set up AWS CLI: `aws configure`
- Or set environment variables in `.env`

**"SMS not sending"**
- Check AWS SNS permissions
- Verify phone number format
- Check AWS region settings

### Mobile Issues:

**"Metro bundler failed"**
```bash
pnpm start --reset-cache
```

**"Android build failed"**
```bash
cd android && ./gradlew clean && cd ..
pnpm android
```

**"iOS build failed"**
```bash
cd ios && rm -rf build && pod install && cd ..
pnpm ios
```

**"GraphQL connection failed"**
- Check `GRAPHQL_ENDPOINT` in `.env`
- Ensure backend server is running
- For Android emulator, use: `http://10.0.2.2:3000/dev/graphql`

## 📊 Expected Test Results

### ✅ Success Indicators:
- Backend health check returns `{"status":"ok"}`
- GraphQL playground loads at localhost:3000/dev/graphql
- Mobile app builds and runs without errors
- Phone verification sends SMS (or shows in logs)
- User registration creates database records
- Cards are generated with AI content
- Real-time updates work between devices
- Push notifications trigger correctly

### ❌ Failure Indicators:
- Server crashes or won't start
- GraphQL errors in browser console
- Mobile app crashes on launch
- Authentication flow breaks
- Database operations fail
- No real-time updates between devices

## 🚀 Production Testing

### AWS Deployment Testing:
```bash
# Deploy to AWS
cd apps/backend
pnpm deploy

# Test production endpoints
curl https://your-api-gateway-url.com/dev/health

# Update mobile .env with production URLs
GRAPHQL_ENDPOINT=https://your-api-gateway-url.com/dev/graphql
```

### App Store Testing:
```bash
# Build release versions
cd apps/mobile

# Android
pnpm build:android

# iOS
pnpm build:ios
```

## 📱 Testing Checklist

- [ ] Backend server starts successfully
- [ ] GraphQL playground accessible
- [ ] Health check endpoint works
- [ ] Phone verification sends SMS
- [ ] User registration completes
- [ ] Partner invitation system works
- [ ] Mobile app builds for Android
- [ ] Mobile app builds for iOS
- [ ] Authentication flow complete
- [ ] Card drawing functionality works
- [ ] AI generates appropriate cards
- [ ] Voting system functions
- [ ] Real-time updates between devices
- [ ] Push notifications work
- [ ] Points system tracks progress
- [ ] Game history displays
- [ ] Production deployment successful
- [ ] App store builds generate

## 🎯 Next Steps

Once all tests pass:

1. **Deploy to production AWS environment**
2. **Set up Firebase for push notifications**
3. **Test with real phone numbers and devices**
4. **Conduct user acceptance testing with couples**
5. **Submit to App Store/Play Store for review**
6. **Set up monitoring and analytics**

---

**Current Status: ✅ Backend API Ready for Testing**
- Server: http://localhost:3000
- GraphQL: http://localhost:3000/dev/graphql
- Health: http://localhost:3000/dev/health