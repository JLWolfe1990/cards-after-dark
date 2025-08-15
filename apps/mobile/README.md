# Cards After Dark Mobile App

React Native mobile application for intimate card games designed for couples.

## Features

- 📱 **Phone Authentication**: Secure authentication using phone number verification
- 👫 **Partner Pairing**: Connect with your partner for shared experiences
- 🃏 **AI-Powered Cards**: Personalized card recommendations using AWS Bedrock
- 🔄 **Real-time Sync**: Live updates when your partner draws cards or votes
- 🔔 **Push Notifications**: Daily reminders and partner activity alerts
- 📊 **Progress Tracking**: Track your intimate journey with points and levels

## Getting Started

### Prerequisites

- Node.js 18+
- React Native development environment
- Android Studio or Xcode
- Firebase project setup

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API endpoints and Firebase config
   ```

3. **Firebase Setup:**
   - Add your `google-services.json` to `android/app/`
   - Add your `GoogleService-Info.plist` to `ios/CardsAfterDark/`

4. **Install iOS dependencies:**
   ```bash
   cd ios && pod install
   ```

### Running the App

**Development:**
```bash
# Start Metro bundler
pnpm start

# Run on Android
pnpm android

# Run on iOS
pnpm ios
```

**Production Builds:**
```bash
# Android APK
pnpm build:android

# iOS Archive
pnpm build:ios
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── common/         # Basic components (Button, Input, etc.)
├── contexts/           # React contexts (Auth, Theme, Notifications)
├── graphql/            # GraphQL queries, mutations, subscriptions
├── navigation/         # React Navigation setup
├── screens/           # Application screens
│   ├── auth/          # Authentication screens
│   ├── game/          # Game-related screens
│   ├── history/       # Game history screens
│   └── profile/       # Profile and settings screens
├── services/          # External services (Apollo, Firebase)
└── utils/             # Utility functions and validation
```

## Authentication Flow

1. **Phone Input**: User enters their phone number
2. **Verification**: SMS code verification via AWS Cognito
3. **User Details**: New users provide first/last name
4. **Partner Invitation**: Option to invite or accept partner invitations
5. **Main App**: Access to card games and features

## Game Flow

1. **Daily Cards**: Each partner draws a card for the day
2. **Voting**: Both partners vote on which card to try
3. **Activity**: Complete the chosen intimate activity
4. **Rating**: Rate the experience and earn points
5. **Progress**: Track your couple's journey and unlock new content

## Real-time Features

- **Partner Card Drawn**: See when your partner draws their card
- **Voting Updates**: Real-time voting progress
- **Activity Completion**: Celebrate completed activities together

## Push Notifications

- **Daily Reminders**: 7 PM notifications to draw cards
- **Partner Activity**: Alerts when your partner takes action
- **Weekly Summary**: Progress updates and encouragement

## Configuration

### Environment Variables

```env
GRAPHQL_ENDPOINT=https://your-api.execute-api.us-east-1.amazonaws.com/dev/graphql
GRAPHQL_WS_ENDPOINT=wss://your-ws.execute-api.us-east-1.amazonaws.com/dev
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=your-project-id
```

### Build Configuration

- **Android**: Configured for release builds with ProGuard
- **iOS**: Configured for App Store distribution
- **Code Signing**: Set up your own certificates for production

## Testing

The app includes comprehensive test IDs for automated testing:

```bash
# Run tests
pnpm test

# Run E2E tests (if configured)
pnpm test:e2e
```

## Deployment

### Android Play Store

1. Generate signed APK: `pnpm build:android`
2. Upload to Play Console
3. Configure store listing and screenshots

### iOS App Store

1. Archive build: `pnpm build:ios`
2. Upload via Xcode or Application Loader
3. Submit for App Store review

## Privacy & Security

- All authentication handled securely via AWS Cognito
- Push notifications are opt-in with clear permissions
- No intimate content stored locally - everything encrypted in transit
- 18+ age verification required during signup

## Contributing

This is a couples' intimate app - please ensure all contributions maintain:
- Tasteful and respectful content
- Privacy-first design
- Inclusive language and design
- Security best practices

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase and AWS service status
3. Contact support with reproduction steps

## License

Private proprietary software - all rights reserved.