import { VALIDATION, POINTS } from '../constants';
import type { CouplePreferences, Card, Rating } from '../types';

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add +1 for US numbers if not present
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // Add + if not present for international
  if (!phone.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return phone;
};

export const validatePhoneNumber = (phone: string): boolean => {
  return VALIDATION.PHONE_NUMBER.test(phone);
};

export const validateVerificationCode = (code: string): boolean => {
  return VALIDATION.VERIFICATION_CODE.test(code);
};

export const calculatePoints = (
  card: Card,
  hasStreak: boolean = false,
  isCompleted: boolean = false,
  rating?: 1 | 2 | 3 | 4 | 5
): number => {
  let total = POINTS.BASE_POINTS * POINTS.SPICE_MULTIPLIER[card.kinkFactor];
  
  if (hasStreak) {
    total += POINTS.STREAK_BONUS;
  }
  
  if (isCompleted) {
    total += POINTS.COMPLETION_BONUS;
  }
  
  if (rating) {
    total += POINTS.RATING_BONUS[rating];
  }
  
  return total;
};

export const calculateLevel = (totalPoints: number): number => {
  // Level progression: 1000 points per level
  return Math.floor(totalPoints / 1000) + 1;
};

export const getPointsForNextLevel = (totalPoints: number): number => {
  const currentLevel = calculateLevel(totalPoints);
  const nextLevelPoints = currentLevel * 1000;
  return nextLevelPoints - totalPoints;
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getSpiceLevelEmoji = (level: 1 | 2 | 3): string => {
  return '🔥'.repeat(level);
};

export const getSpiceLevelText = (level: 1 | 2 | 3): string => {
  switch (level) {
    case 1: return 'Mild';
    case 2: return 'Medium';
    case 3: return 'Spicy';
  }
};

export const getCategoryEmoji = (category: string): string => {
  switch (category) {
    case 'romance': return '💕';
    case 'sensual': return '🌹';
    case 'date_night': return '🍷';
    case 'playful': return '😈';
    case 'intimate': return '🔥';
    case 'adventure': return '🎲';
    default: return '💖';
  }
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms));
};

export const isToday = (date: string): boolean => {
  const today = formatDate(new Date());
  return date === today;
};

export const isExpired = (expiresAt: string): boolean => {
  return new Date() > new Date(expiresAt);
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 3600000);
};

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 86400000);
};

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const maskPhoneNumber = (phone: string): string => {
  if (phone.length < 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
};

export const getTimeUntilNotification = (notificationTime: string = '19:00'): number => {
  const now = new Date();
  const [hours, minutes] = notificationTime.split(':').map(Number);
  
  const notification = new Date();
  notification.setHours(hours, minutes, 0, 0);
  
  // If notification time has passed today, schedule for tomorrow
  if (notification <= now) {
    notification.setDate(notification.getDate() + 1);
  }
  
  return notification.getTime() - now.getTime();
};

export const filterCardsByPreferences = (
  cards: Card[],
  preferences: CouplePreferences
): Card[] => {
  return cards.filter(card => {
    // Check spice level
    if (card.kinkFactor > preferences.maxKinkFactor) {
      return false;
    }
    
    // Check categories
    if (preferences.categories.length > 0 && 
        !preferences.categories.includes(card.category)) {
      return false;
    }
    
    // Check excluded tags
    if (preferences.excludedTags.some(tag => card.tags.includes(tag))) {
      return false;
    }
    
    return true;
  });
};

export const getAverageRating = (ratings: Rating[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return sum / ratings.length;
};

export const shouldShowStreak = (streakDays: number): boolean => {
  return streakDays >= 3;
};

export const getStreakEmoji = (streakDays: number): string => {
  if (streakDays < 3) return '';
  if (streakDays < 7) return '🔥';
  if (streakDays < 14) return '🔥🔥';
  if (streakDays < 30) return '🔥🔥🔥';
  return '🔥🔥🔥🔥';
};

export const validateName = (name: string): boolean => {
  return name.length >= VALIDATION.NAME_MIN_LENGTH && 
         name.length <= VALIDATION.NAME_MAX_LENGTH;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};