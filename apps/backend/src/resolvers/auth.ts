import { UserInputError, AuthenticationError } from 'apollo-server-express';
import { 
  generateSessionId, 
  generateVerificationCode, 
  addMinutes, 
  formatPhoneNumber,
  phoneVerificationSchema,
  codeVerificationSchema,
  userRegistrationSchema,
  updateProfileSchema,
  formatValidationError,
  RATE_LIMITS
} from '@cards-after-dark/shared';
import { Context } from '../utils/context';
import { generateJWT, requireAuth } from '../utils/auth';
import {
  createUser,
  getUserByPhone,
  updateUser,
  createVerificationSession,
  getVerificationSession,
  updateVerificationSession,
  getCoupleByUserId,
} from '../services/database';

const authResolvers = {
  Mutation: {
    sendPhoneVerification: async (_: any, { phoneNumber }: { phoneNumber: string }, context: Context) => {
      try {
        // Validate input
        const validatedData = phoneVerificationSchema.parse({ phoneNumber: formatPhoneNumber(phoneNumber) });
        const formattedPhone = validatedData.phoneNumber;

        // Check rate limiting (simplified for now)
        // In production, implement proper rate limiting with Redis or DynamoDB

        // Generate verification code (use fixed code in development for testing)
        const code = process.env.NODE_ENV === 'development' ? '123456' : generateVerificationCode();
        const sessionId = generateSessionId();
        const expiresAt = addMinutes(new Date(), 15).toISOString(); // 15 minute expiry

        // Store verification session
        await createVerificationSession({
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
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
          // Don't fail the request if SMS fails, user can still enter code manually for testing
        }

        return {
          sessionId,
          message: 'Verification code sent to your phone'
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new UserInputError(formatValidationError(error));
        }
        console.error('Phone verification error:', error);
        throw new Error('Failed to send verification code');
      }
    },

    verifyPhoneCode: async (_: any, { sessionId, code }: { sessionId: string; code: string }, context: Context) => {
      try {
        // Validate input
        const validatedData = codeVerificationSchema.parse({ sessionId, code });

        // Get verification session
        const session = await getVerificationSession(validatedData.sessionId, context.dynamodb);
        if (!session) {
          throw new UserInputError('Invalid or expired verification session');
        }

        // Check if session is expired
        if (new Date() > new Date(session.expiresAt)) {
          throw new UserInputError('Verification code has expired');
        }

        // Check rate limiting
        if (session.attempts >= RATE_LIMITS.CODE_VERIFICATION.MAX_ATTEMPTS) {
          throw new UserInputError('Too many verification attempts. Please request a new code.');
        }

        // Verify code
        if (session.code !== validatedData.code) {
          // Increment attempts
          await updateVerificationSession(validatedData.sessionId, {
            attempts: session.attempts + 1
          }, context.dynamodb);
          
          throw new UserInputError('Invalid verification code');
        }

        // Check if user already exists
        let user = await getUserByPhone(session.phoneNumber, context.dynamodb);
        
        if (!user) {
          // Create new user
          user = await createUser({
            phoneNumber: session.phoneNumber,
            firstName: '',
            lastName: '',
          }, context.dynamodb);
        }

        // Mark user as verified
        if (!user.isVerified) {
          user = await updateUser(user.id, { isVerified: true }, context.dynamodb);
        }

        // Get couple if exists
        const couple = await getCoupleByUserId(user.id, context.dynamodb);

        // Generate JWT token
        const token = generateJWT(user);

        return {
          token,
          user,
          couple,
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new UserInputError(formatValidationError(error));
        }
        if (error instanceof UserInputError) {
          throw error;
        }
        console.error('Code verification error:', error);
        throw new Error('Verification failed');
      }
    },

    completeProfile: async (_: any, { input }: { input: any }, context: Context) => {
      try {
        const user = requireAuth(context);
        
        // Validate input
        const validatedData = userRegistrationSchema.parse(input);

        // Update user profile
        const updatedUser = await updateUser(user.id, {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          avatarUrl: validatedData.avatarUrl,
        }, context.dynamodb);

        return updatedUser;
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new UserInputError(formatValidationError(error));
        }
        if (error instanceof AuthenticationError) {
          throw error;
        }
        console.error('Profile completion error:', error);
        throw new Error('Failed to complete profile');
      }
    },

    updateProfile: async (_: any, { input }: { input: any }, context: Context) => {
      try {
        const user = requireAuth(context);
        
        // Validate input
        const validatedData = updateProfileSchema.parse(input);

        // Update user profile
        const updatedUser = await updateUser(user.id, validatedData, context.dynamodb);

        return updatedUser;
      } catch (error: any) {
        if (error.name === 'ZodError') {
          throw new UserInputError(formatValidationError(error));
        }
        if (error instanceof AuthenticationError) {
          throw error;
        }
        console.error('Profile update error:', error);
        throw new Error('Failed to update profile');
      }
    },

    updateFCMToken: async (_: any, { token }: { token: string }, context: Context) => {
      try {
        const user = requireAuth(context);

        await updateUser(user.id, { fcmToken: token }, context.dynamodb);

        return true;
      } catch (error: any) {
        if (error instanceof AuthenticationError) {
          throw error;
        }
        console.error('FCM token update error:', error);
        throw new Error('Failed to update notification token');
      }
    },

    refreshToken: async (_: any, { refreshToken }: { refreshToken: string }, context: Context) => {
      // TODO: Implement refresh token logic
      // For now, just validate the current token and return user data
      try {
        const user = requireAuth(context);
        const couple = await getCoupleByUserId(user.id, context.dynamodb);
        
        return {
          token: generateJWT(user),
          user,
          couple,
        };
      } catch (error: any) {
        throw new AuthenticationError('Invalid refresh token');
      }
    },
  },
};

export default authResolvers;