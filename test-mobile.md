# Mobile App Testing Guide

## 1. Development Setup

### Install React Native dependencies:
```bash
cd apps/mobile
pnpm install

# For iOS (macOS only):
cd ios && pod install && cd ..

# Start Metro bundler:
pnpm start
```

### Environment Configuration:
```bash
# Copy environment template:
cp .env.example .env

# Edit .env with your values:
GRAPHQL_ENDPOINT=https://your-api-gateway-url/dev/graphql
GRAPHQL_WS_ENDPOINT=wss://your-ws-endpoint/dev
FIREBASE_API_KEY=your-firebase-key
```

## 2. Android Testing

### Run on Android device/emulator:
```bash
pnpm android
```

### Test Android-specific features:
- Push notification permissions
- SMS auto-fill for verification codes
- Deep linking from SMS invitations
- Background app refresh

## 3. iOS Testing (macOS only)

### Run on iOS simulator:
```bash
pnpm ios
```

### Test iOS-specific features:
- Face ID/Touch ID integration
- iOS notification styles
- Background app refresh
- App Store compliance

## 4. End-to-End User Flow Testing

### Single User Registration:
1. **Phone Input Screen**
   - Enter phone number: `(555) 123-4567`
   - Tap "Continue"
   - Verify SMS is sent

2. **Code Verification Screen**
   - Enter 6-digit code from SMS
   - Auto-focus between inputs
   - Test resend functionality

3. **User Details Screen** (new users only)
   - Enter first/last name
   - Tap "Create Account"
   - Verify account creation

4. **Partner Invitation Screen**
   - Either invite partner or skip
   - Test SMS invitation sending

### Couple Flow Testing:
1. **User A** completes registration
2. **User A** invites User B via phone number
3. **User B** receives SMS invitation
4. **User B** clicks invitation link
5. **User B** completes registration
6. **Both users** see couple connection

### Game Flow Testing:
1. **Daily Game Start**
   - Both users see "Draw Card" button
   - Each draws their card
   - Cards appear for both users

2. **Voting Phase**
   - Both users vote on preferred card
   - Real-time vote updates
   - Selected card revealed

3. **Activity Completion**
   - Complete chosen activity
   - Rate experience (1-5 stars)
   - Points awarded and displayed

### Real-time Testing:
1. **Open app on two devices** (different users)
2. **User A draws card** → User B sees notification
3. **User B votes** → User A sees vote update
4. **Complete activity** → Both see results

## 5. Push Notification Testing

### Setup Test:
1. Register for notifications on both devices
2. Accept permissions when prompted
3. Verify tokens are sent to backend

### Daily Notification Test:
1. Set notification time to current time + 1 minute
2. Close app completely
3. Wait for notification at scheduled time
4. Tap notification to open app

### Partner Activity Notifications:
1. User A draws card
2. User B receives push notification
3. Tap notification opens to game screen

## 6. Error Handling Testing

### Network Errors:
- Turn off WiFi/data during operations
- Test offline state handling
- Verify error messages are user-friendly

### Invalid Input Testing:
- Invalid phone numbers
- Wrong verification codes
- Empty form submissions
- Special characters in names

### Edge Cases:
- App backgrounding during verification
- Phone number already registered
- Invitation to non-existent number
- Multiple concurrent sessions

## 7. Performance Testing

### Load Testing:
- Multiple rapid card draws
- Subscription connection stability
- Large game history lists
- Image/card loading performance

### Memory Testing:
- Extended app usage (30+ minutes)
- Navigation between screens
- Background/foreground cycling

## Expected Results:
- ✅ Smooth authentication flow
- ✅ Real-time partner synchronization
- ✅ Push notifications work reliably
- ✅ Graceful error handling
- ✅ Responsive UI on different screen sizes
- ✅ Stable performance over extended use

## Common Issues & Solutions:

### "Metro bundler not found":
```bash
pnpm start --reset-cache
```

### "Build failed - Android":
```bash
cd android && ./gradlew clean && cd ..
pnpm android
```

### "iOS build issues":
```bash
cd ios && rm -rf build && pod install && cd ..
pnpm ios
```

### "GraphQL connection failed":
- Check GRAPHQL_ENDPOINT in .env
- Verify backend is deployed and accessible
- Check AWS Lambda logs for errors