import { gql } from '@apollo/client';

export const SEND_VERIFICATION_CODE = gql`
  mutation SendVerificationCode($phoneNumber: String!) {
    sendVerificationCode(phoneNumber: $phoneNumber) {
      sessionId
      message
    }
  }
`;

export const VERIFY_CODE = gql`
  mutation VerifyCode($sessionId: String!, $code: String!, $firstName: String, $lastName: String) {
    verifyCode(sessionId: $sessionId, code: $code, firstName: $firstName, lastName: $lastName) {
      token
      user {
        id
        phoneNumber
        firstName
        lastName
        avatarUrl
        partnerId
        coupleId
        isVerified
        createdAt
        fcmToken
      }
      couple {
        id
        users {
          id
          phoneNumber
          firstName
          lastName
          avatarUrl
          partnerId
          coupleId
          isVerified
          createdAt
          fcmToken
        }
        totalPoints
        level
        streakDays
        preferences {
          categories
          maxKinkFactor
          excludedTags
          notificationTime
          timezone
        }
        createdAt
      }
    }
  }
`;

export const SEND_PARTNER_INVITATION = gql`
  mutation SendPartnerInvitation($phoneNumber: String!) {
    sendPartnerInvitation(phoneNumber: $phoneNumber) {
      id
      phoneNumber
      invitingUserId
      status
      sentAt
      acceptedAt
    }
  }
`;

export const ACCEPT_INVITATION = gql`
  mutation AcceptInvitation($invitationId: String!) {
    acceptInvitation(invitationId: $invitationId) {
      id
      users {
        id
        phoneNumber
        firstName
        lastName
        avatarUrl
        partnerId
        coupleId
        isVerified
        createdAt
        fcmToken
      }
      totalPoints
      level
      streakDays
      preferences {
        categories
        maxKinkFactor
        excludedTags
        notificationTime
        timezone
      }
      createdAt
    }
  }
`;

export const DRAW_CARD = gql`
  mutation DrawCard {
    drawCard {
      id
      title
      description
      kinkFactor
      category
      tags
    }
  }
`;

export const VOTE_FOR_CARD = gql`
  mutation VoteForCard($cardId: String!) {
    voteForCard(cardId: $cardId)
  }
`;

export const COMPLETE_ACTIVITY = gql`
  mutation CompleteActivity($cardId: String!, $rating: Int!) {
    completeActivity(cardId: $cardId, rating: $rating) {
      session {
        id
        coupleId
        date
        userCards {
          userId
          card {
            id
            title
            description
            kinkFactor
            category
            tags
          }
          drawnAt
        }
        votes {
          userId
          cardId
          votedAt
        }
        selectedCard {
          userId
          card {
            id
            title
            description
            kinkFactor
            category
            tags
          }
          drawnAt
        }
        completed
        points
        status
        createdAt
        completedAt
      }
      pointsEarned
    }
  }
`;

export const UPDATE_FCM_TOKEN = gql`
  mutation UpdateFcmToken($fcmToken: String!) {
    updateFcmToken(fcmToken: $fcmToken) {
      id
      fcmToken
    }
  }
`;

export const UPDATE_COUPLE_PREFERENCES = gql`
  mutation UpdateCouplePreferences($preferences: CouplePreferencesInput!) {
    updateCouplePreferences(preferences: $preferences) {
      id
      preferences {
        categories
        maxKinkFactor
        excludedTags
        notificationTime
        timezone
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;