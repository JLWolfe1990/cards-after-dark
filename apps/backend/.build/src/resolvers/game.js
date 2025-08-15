"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const shared_1 = require("@cards-after-dark/shared");
const auth_1 = require("../utils/auth");
const pubsub_1 = require("../utils/pubsub");
const ai_1 = require("../services/ai");
const database_1 = require("../services/database");
const gameResolvers = {
    Query: {
        getDailyCards: async (_, __, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                // Get couple information and preferences
                const couple = await (0, database_1.getCoupleById)(coupleId, context.dynamodb);
                if (!couple) {
                    throw new Error('Couple not found');
                }
                // Get recent game history for AI context
                const recentSessions = await (0, database_1.getGameHistory)(coupleId, 10, context.dynamodb);
                const recentCards = recentSessions
                    .flatMap(session => session.userCards.map(uc => uc.card))
                    .slice(-20); // Last 20 cards
                // Get user ratings for AI context
                const userRatings = await (0, database_1.getUserRatings)(user.id, 50, context.dynamodb);
                // Generate AI recommendations
                const aiResponse = await (0, ai_1.generateAIRecommendations)({
                    coupleId,
                    preferences: couple.preferences,
                    recentHistory: recentCards,
                    userRatings,
                }, context.bedrock);
                return aiResponse.cards;
            }
            catch (error) {
                console.error('Get daily cards error:', error);
                if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
                    throw error;
                }
                throw new Error('Failed to get daily cards');
            }
        },
        getCurrentGameSession: async (_, __, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                const session = await (0, database_1.getCurrentGameSession)(coupleId, context.dynamodb);
                return session;
            }
            catch (error) {
                console.error('Get current game session error:', error);
                if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
                    throw error;
                }
                throw new Error('Failed to get game session');
            }
        },
        getGameSession: async (_, { date }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                const session = await (0, database_1.getCurrentGameSession)(coupleId, context.dynamodb);
                if (session.date !== date) {
                    return null;
                }
                return session;
            }
            catch (error) {
                console.error('Get game session error:', error);
                throw new Error('Failed to get game session');
            }
        },
        getGameHistory: async (_, { limit = 20 }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                const history = await (0, database_1.getGameHistory)(coupleId, Math.min(limit, 100), context.dynamodb);
                return history;
            }
            catch (error) {
                console.error('Get game history error:', error);
                throw new Error('Failed to get game history');
            }
        },
        getCardCategories: () => {
            return Object.values(shared_1.CardCategory);
        },
    },
    Mutation: {
        drawCard: async (_, __, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                // Get current game session
                const session = await (0, database_1.getCurrentGameSession)(coupleId, context.dynamodb);
                // Check if user already drew a card today
                const existingCard = session.userCards.find(uc => uc.userId === user.id);
                if (existingCard) {
                    throw new apollo_server_express_1.UserInputError('You already drew a card today');
                }
                // Check daily limit
                if (session.userCards.length >= shared_1.GAME_CONFIG.MAX_CARD_DRAWS_PER_DAY * 2) {
                    throw new apollo_server_express_1.UserInputError('Maximum card draws reached for today');
                }
                // Get AI-recommended cards
                const couple = await (0, database_1.getCoupleById)(coupleId, context.dynamodb);
                if (!couple) {
                    throw new Error('Couple not found');
                }
                const recentSessions = await (0, database_1.getGameHistory)(coupleId, 10, context.dynamodb);
                const recentCards = recentSessions
                    .flatMap(s => s.userCards.map(uc => uc.card))
                    .slice(-20);
                const userRatings = await (0, database_1.getUserRatings)(user.id, 50, context.dynamodb);
                const aiResponse = await (0, ai_1.generateAIRecommendations)({
                    coupleId,
                    preferences: couple.preferences,
                    recentHistory: recentCards,
                    userRatings,
                }, context.bedrock);
                // Randomly select one card from AI recommendations
                const availableCards = aiResponse.cards.filter(card => !session.userCards.some(uc => uc.card.id === card.id));
                if (availableCards.length === 0) {
                    throw new Error('No available cards to draw');
                }
                const selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];
                // Create drawn card
                const drawnCard = {
                    userId: user.id,
                    card: selectedCard,
                    drawnAt: new Date().toISOString(),
                };
                // Update game session
                const updatedSession = await (0, database_1.updateGameSession)(coupleId, session.date, {
                    userCards: [...session.userCards, drawnCard],
                    status: session.userCards.length === 0 ? 'drawn' : 'voting',
                }, context.dynamodb);
                // Publish to subscriptions
                pubsub_1.pubsub.publish(pubsub_1.SUBSCRIPTION_TOPICS.PARTNER_CARD_DRAWN, {
                    coupleId,
                    drawnCard,
                });
                return drawnCard;
            }
            catch (error) {
                console.error('Draw card error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
                    throw error;
                }
                throw new Error('Failed to draw card');
            }
        },
        voteForCard: async (_, { cardId }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                // Get current game session
                const session = await (0, database_1.getCurrentGameSession)(coupleId, context.dynamodb);
                // Check if both partners have drawn cards
                if (session.userCards.length < 2) {
                    throw new apollo_server_express_1.UserInputError('Both partners must draw cards before voting');
                }
                // Check if user already voted
                const existingVote = session.votes.find(v => v.userId === user.id);
                if (existingVote) {
                    throw new apollo_server_express_1.UserInputError('You already voted');
                }
                // Check if card exists in drawn cards
                const cardExists = session.userCards.some(uc => uc.card.id === cardId);
                if (!cardExists) {
                    throw new apollo_server_express_1.UserInputError('Invalid card selection');
                }
                // Create vote
                const vote = {
                    userId: user.id,
                    cardId,
                    votedAt: new Date().toISOString(),
                };
                const updatedVotes = [...session.votes, vote];
                // Check if both partners have voted
                const partnerVote = updatedVotes.find(v => v.userId !== user.id);
                let sessionUpdates = {
                    votes: updatedVotes,
                };
                if (partnerVote) {
                    // Both voted - determine selected card
                    let selectedCard;
                    if (vote.cardId === partnerVote.cardId) {
                        // Same card chosen
                        selectedCard = session.userCards.find(uc => uc.card.id === vote.cardId);
                    }
                    else {
                        // Different cards - random selection
                        const randomCardId = Math.random() < 0.5 ? vote.cardId : partnerVote.cardId;
                        selectedCard = session.userCards.find(uc => uc.card.id === randomCardId);
                    }
                    // Calculate points
                    const points = (0, shared_1.calculatePoints)(selectedCard.card);
                    sessionUpdates = {
                        ...sessionUpdates,
                        selectedCard,
                        points,
                        status: 'selected',
                    };
                    // Update session
                    const updatedSession = await (0, database_1.updateGameSession)(coupleId, session.date, sessionUpdates, context.dynamodb);
                    // Publish voting complete
                    pubsub_1.pubsub.publish(pubsub_1.SUBSCRIPTION_TOPICS.VOTING_COMPLETE, {
                        coupleId,
                        selectedCard,
                        points,
                        votes: updatedVotes,
                    });
                }
                else {
                    // Only one vote so far
                    await (0, database_1.updateGameSession)(coupleId, session.date, sessionUpdates, context.dynamodb);
                    // Publish partner vote
                    pubsub_1.pubsub.publish(pubsub_1.SUBSCRIPTION_TOPICS.PARTNER_VOTE, {
                        coupleId,
                        vote,
                    });
                }
                return true;
            }
            catch (error) {
                console.error('Vote for card error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
                    throw error;
                }
                throw new Error('Failed to vote for card');
            }
        },
        completeActivity: async (_, { input }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                const coupleId = (0, auth_1.requireCouple)(user);
                const { sessionId, rating, notes } = input;
                // Get game session
                const session = await (0, database_1.getCurrentGameSession)(coupleId, context.dynamodb);
                if (!session.selectedCard) {
                    throw new apollo_server_express_1.UserInputError('No activity selected');
                }
                if (session.completed) {
                    throw new apollo_server_express_1.UserInputError('Activity already completed');
                }
                // Calculate final points (with rating bonus if provided)
                let finalPoints = session.points;
                if (rating) {
                    finalPoints = (0, shared_1.calculatePoints)(session.selectedCard.card, false, true, rating);
                }
                // Mark session as completed
                const updatedSession = await (0, database_1.updateGameSession)(coupleId, session.date, {
                    completed: true,
                    status: 'completed',
                    points: finalPoints,
                    completedAt: new Date().toISOString(),
                }, context.dynamodb);
                // Update couple's total points and streak
                const couple = await (0, database_1.getCoupleById)(coupleId, context.dynamodb);
                if (couple) {
                    await (0, database_1.updateCouple)(coupleId, {
                        totalPoints: couple.totalPoints + finalPoints,
                        streakDays: couple.streakDays + 1, // TODO: Implement proper streak logic
                    }, context.dynamodb);
                }
                // Save rating if provided
                if (rating) {
                    await (0, database_1.createRating)({
                        userId: user.id,
                        cardId: session.selectedCard.card.id,
                        rating: rating,
                    }, context.dynamodb);
                }
                // Publish activity completed
                pubsub_1.pubsub.publish(pubsub_1.SUBSCRIPTION_TOPICS.ACTIVITY_COMPLETED, {
                    coupleId,
                    gameSession: updatedSession,
                    pointsEarned: finalPoints,
                });
                return updatedSession;
            }
            catch (error) {
                console.error('Complete activity error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to complete activity');
            }
        },
        rateCard: async (_, { cardId, rating }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                if (rating < 1 || rating > 5) {
                    throw new apollo_server_express_1.UserInputError('Rating must be between 1 and 5');
                }
                const newRating = await (0, database_1.createRating)({
                    userId: user.id,
                    cardId,
                    rating: rating,
                }, context.dynamodb);
                return newRating;
            }
            catch (error) {
                console.error('Rate card error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to rate card');
            }
        },
        updateRating: async (_, { cardId, rating }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                if (rating < 1 || rating > 5) {
                    throw new apollo_server_express_1.UserInputError('Rating must be between 1 and 5');
                }
                const updatedRating = await (0, database_1.updateRating)(user.id, cardId, rating, context.dynamodb);
                return updatedRating;
            }
            catch (error) {
                console.error('Update rating error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to update rating');
            }
        },
    },
    Subscription: {
        onPartnerCardDrawn: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator([pubsub_1.SUBSCRIPTION_TOPICS.PARTNER_CARD_DRAWN]), (payload, variables) => {
                return payload.coupleId === variables.coupleId;
            }),
        },
        onPartnerVote: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator([pubsub_1.SUBSCRIPTION_TOPICS.PARTNER_VOTE]), (payload, variables) => {
                return payload.coupleId === variables.coupleId;
            }),
        },
        onVotingComplete: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator([pubsub_1.SUBSCRIPTION_TOPICS.VOTING_COMPLETE]), (payload, variables) => {
                return payload.coupleId === variables.coupleId;
            }),
        },
        onActivityCompleted: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator([pubsub_1.SUBSCRIPTION_TOPICS.ACTIVITY_COMPLETED]), (payload, variables) => {
                return payload.coupleId === variables.coupleId;
            }),
        },
    },
};
exports.default = gameResolvers;
//# sourceMappingURL=game.js.map