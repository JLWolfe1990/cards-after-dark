import { gql } from '@apollo/client';

export const PARTNER_CARD_DRAWN = gql`
  subscription PartnerCardDrawn($coupleId: String!) {
    partnerCardDrawn(coupleId: $coupleId) {
      coupleId
      drawnCard {
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
    }
  }
`;

export const PARTNER_VOTE = gql`
  subscription PartnerVote($coupleId: String!) {
    partnerVote(coupleId: $coupleId) {
      coupleId
      vote {
        userId
        cardId
        votedAt
      }
    }
  }
`;

export const VOTING_COMPLETE = gql`
  subscription VotingComplete($coupleId: String!) {
    votingComplete(coupleId: $coupleId) {
      coupleId
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
      points
      votes {
        userId
        cardId
        votedAt
      }
    }
  }
`;

export const ACTIVITY_COMPLETED = gql`
  subscription ActivityCompleted($coupleId: String!) {
    activityCompleted(coupleId: $coupleId) {
      coupleId
      gameSession {
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