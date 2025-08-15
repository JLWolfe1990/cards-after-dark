import { PubSub } from 'graphql-subscriptions';

// Create a single PubSub instance for the entire application
export const pubsub = new PubSub();

// Define subscription topics as constants
export const SUBSCRIPTION_TOPICS = {
  PARTNER_CARD_DRAWN: 'PARTNER_CARD_DRAWN',
  PARTNER_VOTE: 'PARTNER_VOTE',
  VOTING_COMPLETE: 'VOTING_COMPLETE',
  ACTIVITY_COMPLETED: 'ACTIVITY_COMPLETED',
  INVITATION_RECEIVED: 'INVITATION_RECEIVED',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  NOTIFICATION: 'NOTIFICATION',
} as const;

export type SubscriptionTopic = typeof SUBSCRIPTION_TOPICS[keyof typeof SUBSCRIPTION_TOPICS];