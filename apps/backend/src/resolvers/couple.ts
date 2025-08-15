import { UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import {
  formatPhoneNumber,
  generateId,
  couplePreferencesSchema,
  invitePartnerSchema,
  formatValidationError,
} from '@cards-after-dark/shared';
import { Context } from '../utils/context';
import { requireAuth } from '../utils/auth';
import { SUBSCRIPTION_TOPICS, pubsub } from '../utils/pubsub';
import {
  createCouple,
  getCoupleById,
  updateCouple,
  getUserByPhone,
  createInvitation,
  getInvitationById,
  getInvitationByPhone,
  updateInvitation,
  updateUser,
} from '../services/database';

const coupleResolvers = {
  Query: {
    getCouple: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);
        
        if (!user.coupleId) {
          return null;
        }

        const couple = await getCoupleById(user.coupleId, context.dynamodb);
        return couple;
      } catch (error: any) {
        console.error('Get couple error:', error);
        if (error.message.includes('must be logged in')) {
          throw error;
        }
        throw new Error('Failed to get couple information');
      }
    },

    getPendingInvitations: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);

        // Get invitation for this user's phone number
        const invitation = await getInvitationByPhone(user.phoneNumber, context.dynamodb);
        
        if (!invitation || invitation.status !== 'sent') {
          return [];
        }

        // Get the inviting user details
        const invitingUser = await context.dynamodb.get({
          TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
          Key: { id: invitation.invitingUserId },
        }).promise();

        return [{
          ...invitation,
          invitingUser: invitingUser.Item,
        }];
      } catch (error: any) {
        console.error('Get pending invitations error:', error);
        throw new Error('Failed to get pending invitations');
      }
    },
  },

  Mutation: {
    invitePartner: async (_: any, { phoneNumber }: { phoneNumber: string }, context: Context) => {
      try {
        const user = requireAuth(context);

        // Validate input
        const validatedData = invitePartnerSchema.parse({ phoneNumber: formatPhoneNumber(phoneNumber) });
        const formattedPhone = validatedData.phoneNumber;

        // Check if user is already in a couple
        if (user.coupleId) {
          throw new UserInputError('You are already in a couple');
        }

        // Check if inviting themselves
        if (formattedPhone === user.phoneNumber) {
          throw new UserInputError('You cannot invite yourself');
        }

        // Check if there's already a pending invitation for this number
        const existingInvitation = await getInvitationByPhone(formattedPhone, context.dynamodb);
        if (existingInvitation && existingInvitation.status === 'sent') {
          throw new UserInputError('Invitation already sent to this number');
        }

        // Check if user exists and is already in a couple
        const existingUser = await getUserByPhone(formattedPhone, context.dynamodb);
        if (existingUser?.coupleId) {
          throw new UserInputError('This person is already in a couple');
        }

        // Create invitation
        const invitation = await createInvitation({
          phoneNumber: formattedPhone,
          invitingUserId: user.id,
        }, context.dynamodb);

        // Send SMS invitation
        try {
          await context.sns.publish({
            PhoneNumber: formattedPhone,
            Message: `${user.firstName} ${user.lastName} has invited you to join CardsAfterDark! Download the app and create an account to connect: https://cards-after-dark.com/app`,
            MessageAttributes: {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: 'CardsAD'
              }
            }
          }).promise();
        } catch (smsError) {
          console.error('SMS invitation failed:', smsError);
          // Don't fail the request if SMS fails
        }

        // If user exists, send real-time notification
        if (existingUser) {
          pubsub.publish(SUBSCRIPTION_TOPICS.INVITATION_RECEIVED, {
            phoneNumber: formattedPhone,
            invitation: {
              ...invitation,
              invitingUser: user,
            },
          });
        }

        return invitation;
      } catch (error: any) {
        console.error('Invite partner error:', error);
        if (error.name === 'ZodError') {
          throw new UserInputError(formatValidationError(error));
        }
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to send invitation');
      }
    },

    acceptInvitation: async (_: any, { invitationId }: { invitationId: string }, context: Context) => {
      try {
        const user = requireAuth(context);

        // Check if user is already in a couple
        if (user.coupleId) {
          throw new UserInputError('You are already in a couple');
        }

        // Get invitation
        const invitation = await getInvitationById(invitationId, context.dynamodb);
        if (!invitation) {
          throw new UserInputError('Invitation not found');
        }

        if (invitation.status !== 'sent') {
          throw new UserInputError('Invitation is no longer valid');
        }

        if (invitation.phoneNumber !== user.phoneNumber) {
          throw new UserInputError('This invitation is not for your phone number');
        }

        // Get inviting user
        const invitingUser = await context.dynamodb.get({
          TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
          Key: { id: invitation.invitingUserId },
        }).promise();

        if (!invitingUser.Item) {
          throw new UserInputError('Inviting user not found');
        }

        if (invitingUser.Item.coupleId) {
          throw new UserInputError('The person who invited you is already in a couple');
        }

        // Create couple
        const couple = await createCouple(invitation.invitingUserId, user.id, context.dynamodb);

        // Mark invitation as accepted
        await updateInvitation(invitationId, {
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
        }, context.dynamodb);

        // Publish invitation accepted
        pubsub.publish(SUBSCRIPTION_TOPICS.INVITATION_ACCEPTED, {
          invitationId,
          couple,
        });

        return couple;
      } catch (error: any) {
        console.error('Accept invitation error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to accept invitation');
      }
    },

    cancelInvitation: async (_: any, { invitationId }: { invitationId: string }, context: Context) => {
      try {
        const user = requireAuth(context);

        // Get invitation
        const invitation = await getInvitationById(invitationId, context.dynamodb);
        if (!invitation) {
          throw new UserInputError('Invitation not found');
        }

        if (invitation.invitingUserId !== user.id) {
          throw new UserInputError('You can only cancel your own invitations');
        }

        if (invitation.status !== 'sent') {
          throw new UserInputError('Invitation cannot be cancelled');
        }

        // Mark invitation as expired
        await updateInvitation(invitationId, {
          status: 'expired',
        }, context.dynamodb);

        return true;
      } catch (error: any) {
        console.error('Cancel invitation error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to cancel invitation');
      }
    },

    createCouple: async (_: any, { partnerId }: { partnerId: string }, context: Context) => {
      try {
        const user = requireAuth(context);

        // Check if user is already in a couple
        if (user.coupleId) {
          throw new UserInputError('You are already in a couple');
        }

        // Check if partner exists and is not in a couple
        const partner = await context.dynamodb.get({
          TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
          Key: { id: partnerId },
        }).promise();

        if (!partner.Item) {
          throw new UserInputError('Partner not found');
        }

        if (partner.Item.coupleId) {
          throw new UserInputError('Partner is already in a couple');
        }

        // Create couple
        const couple = await createCouple(user.id, partnerId, context.dynamodb);
        return couple;
      } catch (error: any) {
        console.error('Create couple error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to create couple');
      }
    },

    updatePreferences: async (_: any, { input }: { input: any }, context: Context) => {
      try {
        const user = requireAuth(context);
        
        if (!user.coupleId) {
          throw new UserInputError('You must be in a couple to update preferences');
        }

        // Validate preferences
        const validatedPrefs = couplePreferencesSchema.parse(input);

        // Update couple preferences
        await updateCouple(user.coupleId, {
          preferences: validatedPrefs,
        }, context.dynamodb);

        return validatedPrefs;
      } catch (error: any) {
        console.error('Update preferences error:', error);
        if (error.name === 'ZodError') {
          throw new UserInputError(formatValidationError(error));
        }
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to update preferences');
      }
    },

    leaveCouple: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);
        
        if (!user.coupleId) {
          throw new UserInputError('You are not in a couple');
        }

        // Get couple to find partner
        const couple = await getCoupleById(user.coupleId, context.dynamodb);
        if (!couple) {
          throw new Error('Couple not found');
        }

        // Remove couple reference from both users
        for (const coupleUser of couple.users) {
          await updateUser(coupleUser.id, { coupleId: undefined }, context.dynamodb);
        }

        // Delete couple record
        await context.dynamodb.delete({
          TableName: `CardsAfterDark-Couples-${process.env.STAGE || 'dev'}`,
          Key: { id: user.coupleId },
        }).promise();

        return true;
      } catch (error: any) {
        console.error('Leave couple error:', error);
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Failed to leave couple');
      }
    },
  },

  Subscription: {
    onInvitationReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.INVITATION_RECEIVED]),
        (payload, variables) => {
          return payload.phoneNumber === variables.phoneNumber;
        }
      ),
    },

    onInvitationAccepted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.INVITATION_ACCEPTED]),
        (payload, variables) => {
          return payload.invitationId === variables.invitationId;
        }
      ),
    },
  },
};

export default coupleResolvers;