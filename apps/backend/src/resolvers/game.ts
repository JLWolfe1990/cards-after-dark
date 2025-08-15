import { UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import {
  DrawnCard,
  Vote,
  GameSession,
  calculatePoints,
  CardCategory,
  GAME_CONFIG,
  formatDate,
} from '@cards-after-dark/shared';
import { Context } from '../utils/context';
import { requireAuth, requireCouple } from '../utils/auth';
import { SUBSCRIPTION_TOPICS, pubsub } from '../utils/pubsub';
import { generateAIRecommendations } from '../services/ai';
import {
  getCurrentGameSession,
  updateGameSession,
  getGameHistory,
  getUserRatings,
  createRating,
  updateRating,
  getCoupleById,
  updateCouple,
} from '../services/database';

const gameResolvers = {
  Query: {
    getDailyCards: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        // Get couple information and preferences
        const couple = await getCoupleById(coupleId, context.dynamodb);
        if (!couple) {
          throw new Error('Couple not found');
        }

        // Get recent game history for AI context
        const recentSessions = await getGameHistory(coupleId, 10, context.dynamodb);
        const recentCards = recentSessions
          .flatMap(session => session.userCards.map(uc => uc.card))
          .slice(-20); // Last 20 cards

        // Get user ratings for AI context
        const userRatings = await getUserRatings(user.id, 50, context.dynamodb);

        // Generate AI recommendations
        const aiResponse = await generateAIRecommendations({
          coupleId,
          preferences: couple.preferences,
          recentHistory: recentCards,
          userRatings,
        }, context.bedrock);

        return aiResponse.cards;
      } catch (error: any) {
        console.error('Get daily cards error:', error);
        if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
          throw error;
        }
        throw new Error('Failed to get daily cards');
      }
    },

    getCurrentGameSession: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        const session = await getCurrentGameSession(coupleId, context.dynamodb);
        return session;
      } catch (error: any) {
        console.error('Get current game session error:', error);
        if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
          throw error;
        }
        throw new Error('Failed to get game session');
      }
    },

    getGameSession: async (_: any, { date }: { date: string }, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        const session = await getCurrentGameSession(coupleId, context.dynamodb);
        if (session.date !== date) {
          return null;
        }

        return session;
      } catch (error: any) {
        console.error('Get game session error:', error);
        throw new Error('Failed to get game session');
      }
    },

    getGameHistory: async (_: any, { limit = 20 }: { limit?: number }, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        const history = await getGameHistory(coupleId, Math.min(limit, 100), context.dynamodb);
        return history;
      } catch (error: any) {
        console.error('Get game history error:', error);
        throw new Error('Failed to get game history');
      }
    },

    getCardCategories: () => {
      return Object.values(CardCategory);
    },
  },

  Mutation: {
    drawCard: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        // Get current game session
        const session = await getCurrentGameSession(coupleId, context.dynamodb);

        // Check if user already drew a card today
        const existingCard = session.userCards.find(uc => uc.userId === user.id);
        if (existingCard) {
          throw new UserInputError('You already drew a card today');
        }

        // Check daily limit
        if (session.userCards.length >= GAME_CONFIG.MAX_CARD_DRAWS_PER_DAY * 2) {
          throw new UserInputError('Maximum card draws reached for today');
        }

        // Get AI-recommended cards
        const couple = await getCoupleById(coupleId, context.dynamodb);
        if (!couple) {
          throw new Error('Couple not found');
        }

        const recentSessions = await getGameHistory(coupleId, 10, context.dynamodb);
        const recentCards = recentSessions
          .flatMap(s => s.userCards.map(uc => uc.card))
          .slice(-20);

        const userRatings = await getUserRatings(user.id, 50, context.dynamodb);

        const aiResponse = await generateAIRecommendations({
          coupleId,
          preferences: couple.preferences,
          recentHistory: recentCards,
          userRatings,
        }, context.bedrock);

        // Randomly select one card from AI recommendations
        const availableCards = aiResponse.cards.filter(card => 
          !session.userCards.some(uc => uc.card.id === card.id)
        );
        
        if (availableCards.length === 0) {
          throw new Error('No available cards to draw');
        }

        const selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];

        // Create drawn card
        const drawnCard: DrawnCard = {
          userId: user.id,
          card: selectedCard,
          drawnAt: new Date().toISOString(),
        };

        // Update game session
        const updatedSession = await updateGameSession(coupleId, session.date, {
          userCards: [...session.userCards, drawnCard],
          status: session.userCards.length === 0 ? 'drawn' : 'voting',
        }, context.dynamodb);

        // Publish to subscriptions
        pubsub.publish(SUBSCRIPTION_TOPICS.PARTNER_CARD_DRAWN, {
          coupleId,
          drawnCard,
        });

        return drawnCard;
      } catch (error: any) {
        console.error('Draw card error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
          throw error;
        }
        throw new Error('Failed to draw card');
      }
    },

    voteForCard: async (_: any, { cardId }: { cardId: string }, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        // Get current game session
        const session = await getCurrentGameSession(coupleId, context.dynamodb);

        // Check if both partners have drawn cards
        if (session.userCards.length < 2) {
          throw new UserInputError('Both partners must draw cards before voting');
        }

        // Check if user already voted
        const existingVote = session.votes.find(v => v.userId === user.id);
        if (existingVote) {
          throw new UserInputError('You already voted');
        }

        // Check if card exists in drawn cards
        const cardExists = session.userCards.some(uc => uc.card.id === cardId);
        if (!cardExists) {
          throw new UserInputError('Invalid card selection');
        }

        // Create vote
        const vote: Vote = {
          userId: user.id,
          cardId,
          votedAt: new Date().toISOString(),
        };

        const updatedVotes = [...session.votes, vote];

        // Check if both partners have voted
        const partnerVote = updatedVotes.find(v => v.userId !== user.id);
        
        let sessionUpdates: Partial<GameSession> = {
          votes: updatedVotes,
        };

        if (partnerVote) {
          // Both voted - determine selected card
          let selectedCard: DrawnCard;
          
          if (vote.cardId === partnerVote.cardId) {
            // Same card chosen
            selectedCard = session.userCards.find(uc => uc.card.id === vote.cardId)!;
          } else {
            // Different cards - random selection
            const randomCardId = Math.random() < 0.5 ? vote.cardId : partnerVote.cardId;
            selectedCard = session.userCards.find(uc => uc.card.id === randomCardId)!;
          }

          // Calculate points
          const points = calculatePoints(selectedCard.card);

          sessionUpdates = {
            ...sessionUpdates,
            selectedCard,
            points,
            status: 'selected',
          };

          // Update session
          const updatedSession = await updateGameSession(coupleId, session.date, sessionUpdates, context.dynamodb);

          // Publish voting complete
          pubsub.publish(SUBSCRIPTION_TOPICS.VOTING_COMPLETE, {
            coupleId,
            selectedCard,
            points,
            votes: updatedVotes,
          });
        } else {
          // Only one vote so far
          await updateGameSession(coupleId, session.date, sessionUpdates, context.dynamodb);

          // Publish partner vote
          pubsub.publish(SUBSCRIPTION_TOPICS.PARTNER_VOTE, {
            coupleId,
            vote,
          });
        }

        return true;
      } catch (error: any) {
        console.error('Vote for card error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        if (error.message.includes('must be logged in') || error.message.includes('must be in a couple')) {
          throw error;
        }
        throw new Error('Failed to vote for card');
      }
    },

    completeActivity: async (_: any, { input }: { input: any }, context: Context) => {
      try {
        const user = requireAuth(context);
        const coupleId = requireCouple(user);

        const { sessionId, rating, notes } = input;

        // Get game session
        const session = await getCurrentGameSession(coupleId, context.dynamodb);
        
        if (!session.selectedCard) {
          throw new UserInputError('No activity selected');
        }

        if (session.completed) {
          throw new UserInputError('Activity already completed');
        }

        // Calculate final points (with rating bonus if provided)
        let finalPoints = session.points;
        if (rating) {
          finalPoints = calculatePoints(session.selectedCard.card, false, true, rating);
        }

        // Mark session as completed
        const updatedSession = await updateGameSession(coupleId, session.date, {
          completed: true,
          status: 'completed',
          points: finalPoints,
          completedAt: new Date().toISOString(),
        }, context.dynamodb);

        // Update couple's total points and streak
        const couple = await getCoupleById(coupleId, context.dynamodb);
        if (couple) {
          await updateCouple(coupleId, {
            totalPoints: couple.totalPoints + finalPoints,
            streakDays: couple.streakDays + 1, // TODO: Implement proper streak logic
          }, context.dynamodb);
        }

        // Save rating if provided
        if (rating) {
          await createRating({
            userId: user.id,
            cardId: session.selectedCard.card.id,
            rating: rating as 1 | 2 | 3 | 4 | 5,
          }, context.dynamodb);
        }

        // Publish activity completed
        pubsub.publish(SUBSCRIPTION_TOPICS.ACTIVITY_COMPLETED, {
          coupleId,
          gameSession: updatedSession,
          pointsEarned: finalPoints,
        });

        return updatedSession;
      } catch (error: any) {
        console.error('Complete activity error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to complete activity');
      }
    },

    rateCard: async (_: any, { cardId, rating }: { cardId: string; rating: number }, context: Context) => {
      try {
        const user = requireAuth(context);

        if (rating < 1 || rating > 5) {
          throw new UserInputError('Rating must be between 1 and 5');
        }

        const newRating = await createRating({
          userId: user.id,
          cardId,
          rating: rating as 1 | 2 | 3 | 4 | 5,
        }, context.dynamodb);

        return newRating;
      } catch (error: any) {
        console.error('Rate card error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to rate card');
      }
    },

    updateRating: async (_: any, { cardId, rating }: { cardId: string; rating: number }, context: Context) => {
      try {
        const user = requireAuth(context);

        if (rating < 1 || rating > 5) {
          throw new UserInputError('Rating must be between 1 and 5');
        }

        const updatedRating = await updateRating(user.id, cardId, rating, context.dynamodb);
        return updatedRating;
      } catch (error: any) {
        console.error('Update rating error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to update rating');
      }
    },
  },

  Subscription: {
    onPartnerCardDrawn: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.PARTNER_CARD_DRAWN]),
        (payload, variables) => {
          return payload.coupleId === variables.coupleId;
        }
      ),
    },

    onPartnerVote: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.PARTNER_VOTE]),
        (payload, variables) => {
          return payload.coupleId === variables.coupleId;
        }
      ),
    },

    onVotingComplete: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.VOTING_COMPLETE]),
        (payload, variables) => {
          return payload.coupleId === variables.coupleId;
        }
      ),
    },

    onActivityCompleted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.ACTIVITY_COMPLETED]),
        (payload, variables) => {
          return payload.coupleId === variables.coupleId;
        }
      ),
    },
  },
};

export default gameResolvers;