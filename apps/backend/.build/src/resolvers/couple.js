"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const shared_1 = require("@cards-after-dark/shared");
const auth_1 = require("../utils/auth");
const pubsub_1 = require("../utils/pubsub");
const database_1 = require("../services/database");
const coupleResolvers = {
    Query: {
        getCouple: async (_, __, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                if (!user.coupleId) {
                    return null;
                }
                const couple = await (0, database_1.getCoupleById)(user.coupleId, context.dynamodb);
                return couple;
            }
            catch (error) {
                console.error('Get couple error:', error);
                if (error.message.includes('must be logged in')) {
                    throw error;
                }
                throw new Error('Failed to get couple information');
            }
        },
        getPendingInvitations: async (_, __, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Get invitation for this user's phone number
                const invitation = await (0, database_1.getInvitationByPhone)(user.phoneNumber, context.dynamodb);
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
            }
            catch (error) {
                console.error('Get pending invitations error:', error);
                throw new Error('Failed to get pending invitations');
            }
        },
    },
    Mutation: {
        invitePartner: async (_, { phoneNumber }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Validate input
                const validatedData = shared_1.invitePartnerSchema.parse({ phoneNumber: (0, shared_1.formatPhoneNumber)(phoneNumber) });
                const formattedPhone = validatedData.phoneNumber;
                // Check if user is already in a couple
                if (user.coupleId) {
                    throw new apollo_server_express_1.UserInputError('You are already in a couple');
                }
                // Check if inviting themselves
                if (formattedPhone === user.phoneNumber) {
                    throw new apollo_server_express_1.UserInputError('You cannot invite yourself');
                }
                // Check if there's already a pending invitation for this number
                const existingInvitation = await (0, database_1.getInvitationByPhone)(formattedPhone, context.dynamodb);
                if (existingInvitation && existingInvitation.status === 'sent') {
                    throw new apollo_server_express_1.UserInputError('Invitation already sent to this number');
                }
                // Check if user exists and is already in a couple
                const existingUser = await (0, database_1.getUserByPhone)(formattedPhone, context.dynamodb);
                if (existingUser?.coupleId) {
                    throw new apollo_server_express_1.UserInputError('This person is already in a couple');
                }
                // Create invitation
                const invitation = await (0, database_1.createInvitation)({
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
                }
                catch (smsError) {
                    console.error('SMS invitation failed:', smsError);
                    // Don't fail the request if SMS fails
                }
                // If user exists, send real-time notification
                if (existingUser) {
                    pubsub_1.pubsub.publish(pubsub_1.SUBSCRIPTION_TOPICS.INVITATION_RECEIVED, {
                        phoneNumber: formattedPhone,
                        invitation: {
                            ...invitation,
                            invitingUser: user,
                        },
                    });
                }
                return invitation;
            }
            catch (error) {
                console.error('Invite partner error:', error);
                if (error.name === 'ZodError') {
                    throw new apollo_server_express_1.UserInputError((0, shared_1.formatValidationError)(error));
                }
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to send invitation');
            }
        },
        acceptInvitation: async (_, { invitationId }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Check if user is already in a couple
                if (user.coupleId) {
                    throw new apollo_server_express_1.UserInputError('You are already in a couple');
                }
                // Get invitation
                const invitation = await (0, database_1.getInvitationById)(invitationId, context.dynamodb);
                if (!invitation) {
                    throw new apollo_server_express_1.UserInputError('Invitation not found');
                }
                if (invitation.status !== 'sent') {
                    throw new apollo_server_express_1.UserInputError('Invitation is no longer valid');
                }
                if (invitation.phoneNumber !== user.phoneNumber) {
                    throw new apollo_server_express_1.UserInputError('This invitation is not for your phone number');
                }
                // Get inviting user
                const invitingUser = await context.dynamodb.get({
                    TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
                    Key: { id: invitation.invitingUserId },
                }).promise();
                if (!invitingUser.Item) {
                    throw new apollo_server_express_1.UserInputError('Inviting user not found');
                }
                if (invitingUser.Item.coupleId) {
                    throw new apollo_server_express_1.UserInputError('The person who invited you is already in a couple');
                }
                // Create couple
                const couple = await (0, database_1.createCouple)(invitation.invitingUserId, user.id, context.dynamodb);
                // Mark invitation as accepted
                await (0, database_1.updateInvitation)(invitationId, {
                    status: 'accepted',
                    acceptedAt: new Date().toISOString(),
                }, context.dynamodb);
                // Publish invitation accepted
                pubsub_1.pubsub.publish(pubsub_1.SUBSCRIPTION_TOPICS.INVITATION_ACCEPTED, {
                    invitationId,
                    couple,
                });
                return couple;
            }
            catch (error) {
                console.error('Accept invitation error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to accept invitation');
            }
        },
        cancelInvitation: async (_, { invitationId }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Get invitation
                const invitation = await (0, database_1.getInvitationById)(invitationId, context.dynamodb);
                if (!invitation) {
                    throw new apollo_server_express_1.UserInputError('Invitation not found');
                }
                if (invitation.invitingUserId !== user.id) {
                    throw new apollo_server_express_1.UserInputError('You can only cancel your own invitations');
                }
                if (invitation.status !== 'sent') {
                    throw new apollo_server_express_1.UserInputError('Invitation cannot be cancelled');
                }
                // Mark invitation as expired
                await (0, database_1.updateInvitation)(invitationId, {
                    status: 'expired',
                }, context.dynamodb);
                return true;
            }
            catch (error) {
                console.error('Cancel invitation error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to cancel invitation');
            }
        },
        createCouple: async (_, { partnerId }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Check if user is already in a couple
                if (user.coupleId) {
                    throw new apollo_server_express_1.UserInputError('You are already in a couple');
                }
                // Check if partner exists and is not in a couple
                const partner = await context.dynamodb.get({
                    TableName: `CardsAfterDark-Users-${process.env.STAGE || 'dev'}`,
                    Key: { id: partnerId },
                }).promise();
                if (!partner.Item) {
                    throw new apollo_server_express_1.UserInputError('Partner not found');
                }
                if (partner.Item.coupleId) {
                    throw new apollo_server_express_1.UserInputError('Partner is already in a couple');
                }
                // Create couple
                const couple = await (0, database_1.createCouple)(user.id, partnerId, context.dynamodb);
                return couple;
            }
            catch (error) {
                console.error('Create couple error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to create couple');
            }
        },
        updatePreferences: async (_, { input }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                if (!user.coupleId) {
                    throw new apollo_server_express_1.UserInputError('You must be in a couple to update preferences');
                }
                // Validate preferences
                const validatedPrefs = shared_1.couplePreferencesSchema.parse(input);
                // Update couple preferences
                await (0, database_1.updateCouple)(user.coupleId, {
                    preferences: validatedPrefs,
                }, context.dynamodb);
                return validatedPrefs;
            }
            catch (error) {
                console.error('Update preferences error:', error);
                if (error.name === 'ZodError') {
                    throw new apollo_server_express_1.UserInputError((0, shared_1.formatValidationError)(error));
                }
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to update preferences');
            }
        },
        leaveCouple: async (_, __, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                if (!user.coupleId) {
                    throw new apollo_server_express_1.UserInputError('You are not in a couple');
                }
                // Get couple to find partner
                const couple = await (0, database_1.getCoupleById)(user.coupleId, context.dynamodb);
                if (!couple) {
                    throw new Error('Couple not found');
                }
                // Remove couple reference from both users
                for (const coupleUser of couple.users) {
                    await (0, database_1.updateUser)(coupleUser.id, { coupleId: undefined }, context.dynamodb);
                }
                // Delete couple record
                await context.dynamodb.delete({
                    TableName: `CardsAfterDark-Couples-${process.env.STAGE || 'dev'}`,
                    Key: { id: user.coupleId },
                }).promise();
                return true;
            }
            catch (error) {
                console.error('Leave couple error:', error);
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                throw new Error('Failed to leave couple');
            }
        },
    },
    Subscription: {
        onInvitationReceived: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator([pubsub_1.SUBSCRIPTION_TOPICS.INVITATION_RECEIVED]), (payload, variables) => {
                return payload.phoneNumber === variables.phoneNumber;
            }),
        },
        onInvitationAccepted: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub_1.pubsub.asyncIterator([pubsub_1.SUBSCRIPTION_TOPICS.INVITATION_ACCEPTED]), (payload, variables) => {
                return payload.invitationId === variables.invitationId;
            }),
        },
    },
};
exports.default = coupleResolvers;
//# sourceMappingURL=couple.js.map