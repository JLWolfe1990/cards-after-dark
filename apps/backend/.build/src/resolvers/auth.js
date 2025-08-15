"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const shared_1 = require("@cards-after-dark/shared");
const auth_1 = require("../utils/auth");
const database_1 = require("../services/database");
const authResolvers = {
    Mutation: {
        sendPhoneVerification: async (_, { phoneNumber }, context) => {
            try {
                // Validate input
                const validatedData = shared_1.phoneVerificationSchema.parse({ phoneNumber: (0, shared_1.formatPhoneNumber)(phoneNumber) });
                const formattedPhone = validatedData.phoneNumber;
                // Check rate limiting (simplified for now)
                // In production, implement proper rate limiting with Redis or DynamoDB
                // Generate verification code (use fixed code in development for testing)
                const code = process.env.NODE_ENV === 'development' ? '123456' : (0, shared_1.generateVerificationCode)();
                const sessionId = (0, shared_1.generateSessionId)();
                const expiresAt = (0, shared_1.addMinutes)(new Date(), 15).toISOString(); // 15 minute expiry
                // Store verification session
                await (0, database_1.createVerificationSession)({
                    sessionId,
                    phoneNumber: formattedPhone,
                    code,
                    expiresAt,
                }, context.dynamodb);
                // In development, always log the code for testing
                if (process.env.NODE_ENV === 'development') {
                    console.log(`🔐 DEVELOPMENT: Verification code for ${formattedPhone} is ${code}`);
                }
                // Send SMS via SNS
                try {
                    await context.sns.publish({
                        PhoneNumber: formattedPhone,
                        Message: `Your CardsAfterDark verification code is: ${code}. Valid for 15 minutes.`,
                        MessageAttributes: {
                            'AWS.SNS.SMS.SenderID': {
                                DataType: 'String',
                                StringValue: 'CardsAD'
                            },
                            'AWS.SNS.SMS.SMSType': {
                                DataType: 'String',
                                StringValue: 'Transactional'
                            }
                        }
                    }).promise();
                    console.log(`📱 SMS sent successfully to ${formattedPhone}`);
                }
                catch (smsError) {
                    console.error('SMS sending failed:', smsError);
                    // Don't fail the request if SMS fails, user can still enter code manually for testing
                }
                return {
                    sessionId,
                    message: 'Verification code sent to your phone'
                };
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    throw new apollo_server_express_1.UserInputError((0, shared_1.formatValidationError)(error));
                }
                console.error('Phone verification error:', error);
                throw new Error('Failed to send verification code');
            }
        },
        verifyPhoneCode: async (_, { sessionId, code }, context) => {
            try {
                // Validate input
                const validatedData = shared_1.codeVerificationSchema.parse({ sessionId, code });
                // Get verification session
                const session = await (0, database_1.getVerificationSession)(validatedData.sessionId, context.dynamodb);
                if (!session) {
                    throw new apollo_server_express_1.UserInputError('Invalid or expired verification session');
                }
                // Check if session is expired
                if (new Date() > new Date(session.expiresAt)) {
                    throw new apollo_server_express_1.UserInputError('Verification code has expired');
                }
                // Check rate limiting
                if (session.attempts >= shared_1.RATE_LIMITS.CODE_VERIFICATION.MAX_ATTEMPTS) {
                    throw new apollo_server_express_1.UserInputError('Too many verification attempts. Please request a new code.');
                }
                // Verify code
                if (session.code !== validatedData.code) {
                    // Increment attempts
                    await (0, database_1.updateVerificationSession)(validatedData.sessionId, {
                        attempts: session.attempts + 1
                    }, context.dynamodb);
                    throw new apollo_server_express_1.UserInputError('Invalid verification code');
                }
                // Check if user already exists
                let user = await (0, database_1.getUserByPhone)(session.phoneNumber, context.dynamodb);
                if (!user) {
                    // Create new user
                    user = await (0, database_1.createUser)({
                        phoneNumber: session.phoneNumber,
                        firstName: '',
                        lastName: '',
                    }, context.dynamodb);
                }
                // Mark user as verified
                if (!user.isVerified) {
                    user = await (0, database_1.updateUser)(user.id, { isVerified: true }, context.dynamodb);
                }
                // Get couple if exists
                const couple = await (0, database_1.getCoupleByUserId)(user.id, context.dynamodb);
                // Generate JWT token
                const token = (0, auth_1.generateJWT)(user);
                return {
                    token,
                    user,
                    couple,
                };
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    throw new apollo_server_express_1.UserInputError((0, shared_1.formatValidationError)(error));
                }
                if (error instanceof apollo_server_express_1.UserInputError) {
                    throw error;
                }
                console.error('Code verification error:', error);
                throw new Error('Verification failed');
            }
        },
        completeProfile: async (_, { input }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Validate input
                const validatedData = shared_1.userRegistrationSchema.parse(input);
                // Update user profile
                const updatedUser = await (0, database_1.updateUser)(user.id, {
                    firstName: validatedData.firstName,
                    lastName: validatedData.lastName,
                    avatarUrl: validatedData.avatarUrl,
                }, context.dynamodb);
                return updatedUser;
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    throw new apollo_server_express_1.UserInputError((0, shared_1.formatValidationError)(error));
                }
                if (error instanceof apollo_server_express_1.AuthenticationError) {
                    throw error;
                }
                console.error('Profile completion error:', error);
                throw new Error('Failed to complete profile');
            }
        },
        updateProfile: async (_, { input }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                // Validate input
                const validatedData = shared_1.updateProfileSchema.parse(input);
                // Update user profile
                const updatedUser = await (0, database_1.updateUser)(user.id, validatedData, context.dynamodb);
                return updatedUser;
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    throw new apollo_server_express_1.UserInputError((0, shared_1.formatValidationError)(error));
                }
                if (error instanceof apollo_server_express_1.AuthenticationError) {
                    throw error;
                }
                console.error('Profile update error:', error);
                throw new Error('Failed to update profile');
            }
        },
        updateFCMToken: async (_, { token }, context) => {
            try {
                const user = (0, auth_1.requireAuth)(context);
                await (0, database_1.updateUser)(user.id, { fcmToken: token }, context.dynamodb);
                return true;
            }
            catch (error) {
                if (error instanceof apollo_server_express_1.AuthenticationError) {
                    throw error;
                }
                console.error('FCM token update error:', error);
                throw new Error('Failed to update notification token');
            }
        },
        refreshToken: async (_, { refreshToken }, context) => {
            // TODO: Implement refresh token logic
            // For now, just validate the current token and return user data
            try {
                const user = (0, auth_1.requireAuth)(context);
                const couple = await (0, database_1.getCoupleByUserId)(user.id, context.dynamodb);
                return {
                    token: (0, auth_1.generateJWT)(user),
                    user,
                    couple,
                };
            }
            catch (error) {
                throw new apollo_server_express_1.AuthenticationError('Invalid refresh token');
            }
        },
    },
};
exports.default = authResolvers;
//# sourceMappingURL=auth.js.map