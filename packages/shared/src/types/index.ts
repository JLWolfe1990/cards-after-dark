export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  partnerId?: string;
  coupleId?: string;
  isVerified: boolean;
  createdAt: string;
  fcmToken?: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  kinkFactor: 1 | 2 | 3;
  category: CardCategory;
  tags: string[];
}

export enum CardCategory {
  ROMANCE = 'romance',
  SENSUAL = 'sensual',
  DATE_NIGHT = 'date_night',
  PLAYFUL = 'playful',
  INTIMATE = 'intimate',
  ADVENTURE = 'adventure'
}

export interface GameSession {
  id: string;
  coupleId: string;
  date: string;
  userCards: DrawnCard[];
  votes: Vote[];
  selectedCard?: DrawnCard;
  completed: boolean;
  points: number;
  status: 'waiting' | 'drawn' | 'voting' | 'selected' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface DrawnCard {
  userId: string;
  card: Card;
  drawnAt: string;
}

export interface Vote {
  userId: string;
  cardId: string;
  votedAt: string;
}

export interface CoupleProfile {
  id: string;
  users: User[];
  totalPoints: number;
  level: number;
  streakDays: number;
  preferences?: CouplePreferences;
  createdAt: string;
}

export interface CouplePreferences {
  categories: CardCategory[];
  maxKinkFactor: 1 | 2 | 3;
  excludedTags: string[];
  notificationTime: string; // "19:00" format
  timezone?: string;
}

export interface Rating {
  userId: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

// Authentication Types
export interface AuthResponse {
  token: string;
  user: User;
  couple?: CoupleProfile;
}

export interface PhoneVerificationResponse {
  sessionId: string;
  message: string;
}

export interface VerificationSession {
  sessionId: string;
  phoneNumber: string;
  code: string;
  expiresAt: string;
  attempts: number;
}

// Invitation Types
export interface Invitation {
  id: string;
  phoneNumber: string;
  invitingUserId: string;
  status: 'sent' | 'accepted' | 'expired';
  sentAt: string;
  acceptedAt?: string;
}

// Notification Types
export interface PushNotification {
  title: string;
  body: string;
  data?: {
    type: 'daily_cards' | 'partner_action' | 'invitation' | 'voting_complete';
    coupleId?: string;
    cardId?: string;
  };
}

// AI Types
export interface AICardRequest {
  coupleId: string;
  preferences: CouplePreferences;
  recentHistory: Card[];
  userRatings: Rating[];
}

export interface AICardResponse {
  cards: Card[];
  reasoning?: string;
}

// Subscription Types
export interface PartnerCardDrawn {
  coupleId: string;
  drawnCard: DrawnCard;
}

export interface PartnerVote {
  coupleId: string;
  vote: Vote;
}

export interface VotingComplete {
  coupleId: string;
  selectedCard: DrawnCard;
  points: number;
  votes: Vote[];
}

export interface ActivityCompleted {
  coupleId: string;
  gameSession: GameSession;
  pointsEarned: number;
}