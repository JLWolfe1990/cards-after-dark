import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
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
  }
`;

export const GET_MY_COUPLE = gql`
  query GetMyCouple {
    myCouple {
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

export const GET_CURRENT_GAME_SESSION = gql`
  query GetCurrentGameSession {
    currentGameSession {
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
  }
`;

export const GET_GAME_HISTORY = gql`
  query GetGameHistory($limit: Int) {
    gameHistory(limit: $limit) {
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
  }
`;

export const GET_INVITATION_BY_PHONE = gql`
  query GetInvitationByPhone($phoneNumber: String!) {
    invitationByPhone(phoneNumber: $phoneNumber) {
      id
      phoneNumber
      invitingUserId
      status
      sentAt
      acceptedAt
    }
  }
`;