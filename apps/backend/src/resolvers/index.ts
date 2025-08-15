import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { requireAuth } from '../utils/auth';
import { Context } from '../utils/context';
import { getUserById, getCoupleById, getUserRatings } from '../services/database';

// Import individual resolver modules
import authResolvers from './auth';
import gameResolvers from './game';
import coupleResolvers from './couple';

// Custom scalar for DateTime
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Main resolvers object
const resolvers = {
  // Custom scalars
  DateTime: DateTimeScalar,

  // Root resolvers
  Query: {
    // User queries
    me: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      return user;
    },

    getUserProfile: async (_: any, { userId }: { userId: string }, context: Context) => {
      requireAuth(context);
      return getUserById(userId, context.dynamodb);
    },

    // Couple queries
    ...coupleResolvers.Query,

    // Game queries
    ...gameResolvers.Query,

    // Rating queries
    getUserRatings: async (_: any, { userId, limit = 50 }: { userId: string; limit?: number }, context: Context) => {
      requireAuth(context);
      return getUserRatings(userId, Math.min(limit, 100), context.dynamodb);
    },

    getCardRatings: async (_: any, { cardId }: { cardId: string }, context: Context) => {
      requireAuth(context);
      
      // Get all ratings for this card
      const result = await context.dynamodb.query({
        TableName: `CardsAfterDark-Ratings-${process.env.STAGE || 'dev'}`,
        IndexName: 'CardIndex', // This would need to be created
        KeyConditionExpression: 'cardId = :cardId',
        ExpressionAttributeValues: {
          ':cardId': cardId,
        },
      }).promise();

      return result.Items || [];
    },
  },

  Mutation: {
    // Auth mutations
    ...authResolvers.Mutation,

    // Couple mutations
    ...coupleResolvers.Mutation,

    // Game mutations
    ...gameResolvers.Mutation,

    // User management
    deleteUser: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);

      // Remove from couple if exists
      if (user.coupleId) {
        const couple = await getCoupleById(user.coupleId, context.dynamodb);
        if (couple) {
          // Remove couple reference from partner
          const partner = couple.users.find(u => u.id !== user.id);
          if (partner) {
            await context.dynamodb.update({
              TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
              Key: { id: partner.id },
              UpdateExpression: 'REMOVE coupleId',
            }).promise();
          }

          // Delete couple
          await context.dynamodb.delete({
            TableName: `CardsAfterDark-Couples-${process.env.STAGE || 'dev'}`,
            Key: { id: user.coupleId },
          }).promise();
        }
      }

      // Delete user
      await context.dynamodb.delete({
        TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
        Key: { id: user.id },
      }).promise();

      // TODO: Delete user's ratings, game sessions, etc.
      
      return true;
    },
  },

  Subscription: {
    // Game subscriptions
    ...gameResolvers.Subscription,

    // Couple subscriptions
    ...coupleResolvers.Subscription,

    // Notification subscription
    onNotification: {
      subscribe: (_: any, { userId }: { userId: string }, context: Context) => {
        requireAuth(context);
        // TODO: Implement notification subscription
        return context.pubsub.asyncIterator([`NOTIFICATION_${userId}`]);
      },
    },
  },

  // Type resolvers for complex fields
  User: {
    partnerId: async (user: any, _: any, context: Context) => {
      if (!user.coupleId) return null;
      
      const couple = await getCoupleById(user.coupleId, context.dynamodb);
      if (!couple) return null;
      
      const partner = couple.users.find(u => u.id !== user.id);
      return partner?.id || null;
    },
  },

  CoupleProfile: {
    level: (couple: any) => {
      // Calculate level based on total points (1000 points per level)
      return Math.floor(couple.totalPoints / 1000) + 1;
    },
  },

  GameSession: {
    // Ensure userCards are properly typed
    userCards: (session: any) => session.userCards || [],
    votes: (session: any) => session.votes || [],
  },

  Invitation: {
    invitingUser: async (invitation: any, _: any, context: Context) => {
      return getUserById(invitation.invitingUserId, context.dynamodb);
    },
  },
};

export default resolvers;