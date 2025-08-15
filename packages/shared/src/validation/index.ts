import { z } from 'zod';
import { VALIDATION, CARD_CATEGORIES } from '../constants';
import type { CardCategory } from '../types';

// Basic validation schemas
export const phoneNumberSchema = z.string()
  .regex(VALIDATION.PHONE_NUMBER, 'Invalid phone number format');

export const verificationCodeSchema = z.string()
  .regex(VALIDATION.VERIFICATION_CODE, 'Verification code must be 6 digits');

export const nameSchema = z.string()
  .min(VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
  .max(VALIDATION.NAME_MAX_LENGTH, `Name must be no more than ${VALIDATION.NAME_MAX_LENGTH} characters`)
  .trim();

export const spiceLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const cardCategorySchema = z.enum(Object.values(CARD_CATEGORIES) as [CardCategory, ...CardCategory[]]);

export const ratingSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)
]);

// Complex validation schemas
export const userRegistrationSchema = z.object({
  phoneNumber: phoneNumberSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  avatarUrl: z.string().url().optional(),
});

export const phoneVerificationSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const codeVerificationSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  code: verificationCodeSchema,
});

export const cardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  kinkFactor: spiceLevelSchema,
  category: cardCategorySchema,
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

export const couplePreferencesSchema = z.object({
  categories: z.array(cardCategorySchema),
  maxKinkFactor: spiceLevelSchema,
  excludedTags: z.array(z.string()),
  notificationTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').default('19:00'),
  timezone: z.string().optional(),
});

export const voteSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
});

export const rateCardSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  rating: ratingSchema,
});

export const completeActivitySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  rating: ratingSchema.optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const invitePartnerSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  avatarUrl: z.string().url().optional(),
});

// Validation helper functions
export const validatePhoneNumber = (phone: string): boolean => {
  try {
    phoneNumberSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
};

export const validateVerificationCode = (code: string): boolean => {
  try {
    verificationCodeSchema.parse(code);
    return true;
  } catch {
    return false;
  }
};

export const validateName = (name: string): boolean => {
  try {
    nameSchema.parse(name);
    return true;
  } catch {
    return false;
  }
};

export const validateCard = (card: any): card is z.infer<typeof cardSchema> => {
  try {
    cardSchema.parse(card);
    return true;
  } catch {
    return false;
  }
};

export const validatePreferences = (prefs: any): prefs is z.infer<typeof couplePreferencesSchema> => {
  try {
    couplePreferencesSchema.parse(prefs);
    return true;
  } catch {
    return false;
  }
};

// Error formatting
export const formatValidationError = (error: z.ZodError): string => {
  return error.errors.map(err => err.message).join(', ');
};

export const getValidationErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.errors.forEach(err => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
};