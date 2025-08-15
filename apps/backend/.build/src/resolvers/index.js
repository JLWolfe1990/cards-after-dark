"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const language_1 = require("graphql/language");
const auth_1 = require("../utils/auth");
const database_1 = require("../services/database");
// Import individual resolver modules
const auth_2 = __importDefault(require("./auth"));
const game_1 = __importDefault(require("./game"));
const couple_1 = __importDefault(require("./couple"));
// Custom scalar for DateTime
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value) {
        return value instanceof Date ? value.toISOString() : value;
    },
    parseValue(value) {
        return new Date(value);
    },
    parseLiteral(ast) {
        if (ast.kind === language_1.Kind.STRING) {
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
        me: async (_, __, context) => {
            const user = (0, auth_1.requireAuth)(context);
            return user;
        },
        getUserProfile: async (_, { userId }, context) => {
            (0, auth_1.requireAuth)(context);
            return (0, database_1.getUserById)(userId, context.dynamodb);
        },
        // Couple queries
        ...couple_1.default.Query,
        // Game queries
        ...game_1.default.Query,
        // Rating queries
        getUserRatings: async (_, { userId, limit = 50 }, context) => {
            (0, auth_1.requireAuth)(context);
            return (0, database_1.getUserRatings)(userId, Math.min(limit, 100), context.dynamodb);
        },
        getCardRatings: async (_, { cardId }, context) => {
            (0, auth_1.requireAuth)(context);
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
        ...auth_2.default.Mutation,
        // Couple mutations
        ...couple_1.default.Mutation,
        // Game mutations
        ...game_1.default.Mutation,
        // User management
        deleteUser: async (_, __, context) => {
            const user = (0, auth_1.requireAuth)(context);
            // Remove from couple if exists
            if (user.coupleId) {
                const couple = await (0, database_1.getCoupleById)(user.coupleId, context.dynamodb);
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
        ...game_1.default.Subscription,
        // Couple subscriptions
        ...couple_1.default.Subscription,
        // Notification subscription
        onNotification: {
            subscribe: (_, { userId }, context) => {
                (0, auth_1.requireAuth)(context);
                // TODO: Implement notification subscription
                return context.pubsub.asyncIterator([`NOTIFICATION_${userId}`]);
            },
        },
    },
    // Type resolvers for complex fields
    User: {
        partnerId: async (user, _, context) => {
            if (!user.coupleId)
                return null;
            const couple = await (0, database_1.getCoupleById)(user.coupleId, context.dynamodb);
            if (!couple)
                return null;
            const partner = couple.users.find(u => u.id !== user.id);
            return partner?.id || null;
        },
    },
    CoupleProfile: {
        level: (couple) => {
            // Calculate level based on total points (1000 points per level)
            return Math.floor(couple.totalPoints / 1000) + 1;
        },
    },
    GameSession: {
        // Ensure userCards are properly typed
        userCards: (session) => session.userCards || [],
        votes: (session) => session.votes || [],
    },
    Invitation: {
        invitingUser: async (invitation, _, context) => {
            return (0, database_1.getUserById)(invitation.invitingUserId, context.dynamodb);
        },
    },
};
exports.default = resolvers;
//# sourceMappingURL=index.js.map