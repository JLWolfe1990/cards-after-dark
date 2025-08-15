# Backend Testing Guide

## 1. Local Backend Testing

### Start the development server:
```bash
cd apps/backend
pnpm dev
```

### Test GraphQL endpoints:
Visit `http://localhost:4000/graphql` in your browser to access GraphQL Playground.

### Sample Test Queries:

**Health Check:**
```graphql
query {
  healthCheck
}
```

**Send Verification Code (Test SMS):**
```graphql
mutation {
  sendVerificationCode(phoneNumber: "+15551234567") {
    sessionId
    message
  }
}
```

**Verify Code (Mock verification):**
```graphql
mutation {
  verifyCode(
    sessionId: "your_session_id"
    code: "123456"
    firstName: "Test"
    lastName: "User"
  ) {
    token
    user {
      id
      firstName
      lastName
      phoneNumber
    }
  }
}
```

## 2. AWS Backend Testing

### Check deployment status:
```bash
pnpm deploy:check
```

### Test AI card generation:
```graphql
mutation {
  drawCard {
    id
    title
    description
    kinkFactor
    category
    tags
  }
}
```

## 3. Database Testing

### Verify DynamoDB tables exist:
- CardsAfterDark-Users-dev
- CardsAfterDark-Couples-dev
- CardsAfterDark-GameSessions-dev
- CardsAfterDark-Ratings-dev
- CardsAfterDark-Invitations-dev
- CardsAfterDark-VerificationSessions-dev

### Test authentication flow:
1. Send verification code
2. Verify code with user details
3. Create user in database
4. Generate JWT token
5. Test authenticated requests

## 4. Real-time Testing

### Test GraphQL subscriptions:
```graphql
subscription {
  partnerCardDrawn(coupleId: "test_couple_id") {
    coupleId
    drawnCard {
      userId
      card {
        title
        description
      }
    }
  }
}
```

## Expected Results:
- ✅ GraphQL server responds on port 4000
- ✅ SMS verification sends actual text messages
- ✅ DynamoDB operations work correctly
- ✅ AI card generation returns varied, appropriate content
- ✅ Real-time subscriptions broadcast events
- ✅ JWT authentication secures protected routes