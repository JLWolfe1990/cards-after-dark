# CardsAfterDark

A mobile app for couples featuring AI-powered intimate card games with daily push notifications.

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate GraphQL types
pnpm codegen

# Start development (all apps)
pnpm dev

# Deploy backend to AWS
pnpm deploy:backend
```

## Architecture

- **Backend**: Express + GraphQL on AWS Lambda
- **Mobile**: React Native with Expo support
- **Database**: DynamoDB
- **AI**: AWS Bedrock (Claude 3 Sonnet)
- **Auth**: AWS Cognito (phone verification)
- **Notifications**: Firebase Cloud Messaging

## Project Structure

```
cards-after-dark/
├── apps/
│   ├── backend/          # Express + GraphQL API
│   └── mobile/           # React Native app
├── packages/
│   ├── shared/           # Shared types and utilities
│   └── graphql-schema/   # GraphQL schema
└── tools/                # Build and deployment tools
```

## Development

Each app can be developed independently:

```bash
# Backend only
pnpm dev --filter=backend

# Mobile only
pnpm dev --filter=mobile
```

## Deployment

- Backend: AWS Lambda via Serverless Framework
- Mobile: App Store + Google Play via EAS Build
- Infrastructure: AWS CDK for provisioning