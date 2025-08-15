export const SPICE_LEVELS = {
  MILD: 1,
  MEDIUM: 2,
  SPICY: 3,
} as const;

export const CARD_CATEGORIES = {
  ROMANCE: 'romance',
  SENSUAL: 'sensual',
  DATE_NIGHT: 'date_night',
  PLAYFUL: 'playful',
  INTIMATE: 'intimate',
  ADVENTURE: 'adventure',
} as const;

export const NOTIFICATION_TIME = '19:00'; // 7 PM

export const POINTS = {
  BASE_POINTS: 100,
  SPICE_MULTIPLIER: {
    1: 1,
    2: 2,
    3: 3,
  },
  STREAK_BONUS: 50,
  COMPLETION_BONUS: 25,
  RATING_BONUS: {
    1: 0,
    2: 5,
    3: 10,
    4: 20,
    5: 30,
  },
} as const;

export const VALIDATION = {
  PHONE_NUMBER: /^\+[1-9]\d{1,14}$/,
  VERIFICATION_CODE: /^\d{6}$/,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 8,
} as const;

export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  HEALTH: '/health',
  UPLOAD: '/upload',
} as const;

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_CODE: 'INVALID_CODE',
  CODE_EXPIRED: 'CODE_EXPIRED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  COUPLE_NOT_FOUND: 'COUPLE_NOT_FOUND',
  PARTNER_NOT_FOUND: 'PARTNER_NOT_FOUND',
  ALREADY_DREW_CARD: 'ALREADY_DREW_CARD',
  ALREADY_VOTED: 'ALREADY_VOTED',
  VOTING_NOT_READY: 'VOTING_NOT_READY',
  ACTIVITY_NOT_SELECTED: 'ACTIVITY_NOT_SELECTED',
  AI_ERROR: 'AI_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export const JWT_CONFIG = {
  EXPIRES_IN: '30d',
  REFRESH_EXPIRES_IN: '90d',
  ALGORITHM: 'HS256',
} as const;

export const AWS_CONFIG = {
  REGION: 'us-east-1',
  BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
  DYNAMO_TABLES: {
    USERS: 'CardsAfterDark-Users',
    COUPLES: 'CardsAfterDark-Couples',
    GAME_SESSIONS: 'CardsAfterDark-GameSessions',
    RATINGS: 'CardsAfterDark-Ratings',
    INVITATIONS: 'CardsAfterDark-Invitations',
    VERIFICATION_SESSIONS: 'CardsAfterDark-VerificationSessions',
  },
} as const;

export const RATE_LIMITS = {
  PHONE_VERIFICATION: {
    MAX_ATTEMPTS: 5,
    WINDOW_HOURS: 1,
  },
  CODE_VERIFICATION: {
    MAX_ATTEMPTS: 3,
    LOCKOUT_MINUTES: 15,
  },
  CARD_DRAW: {
    MAX_PER_DAY: 10,
  },
  AI_REQUESTS: {
    MAX_PER_HOUR: 20,
  },
} as const;

export const GAME_CONFIG = {
  DAILY_CARDS_COUNT: 7,
  MAX_CARD_DRAWS_PER_DAY: 3,
  VOTING_TIMEOUT_HOURS: 12,
  ACTIVITY_TIMEOUT_HOURS: 48,
  STREAK_RESET_HOURS: 36,
} as const;

export const NOTIFICATION_TYPES = {
  DAILY_CARDS: 'daily_cards',
  PARTNER_DREW_CARD: 'partner_drew_card',
  PARTNER_VOTED: 'partner_voted',
  VOTING_COMPLETE: 'voting_complete',
  ACTIVITY_REMINDER: 'activity_reminder',
  STREAK_REMINDER: 'streak_reminder',
  INVITATION_RECEIVED: 'invitation_received',
  INVITATION_ACCEPTED: 'invitation_accepted',
} as const;