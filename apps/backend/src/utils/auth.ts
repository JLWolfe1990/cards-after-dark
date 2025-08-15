import jwt from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-express';
import { Context } from './context';
import { User } from '@cards-after-dark/shared';

export const requireAuth = (context: Context): User => {
  if (!context.user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
  return context.user;
};

export const requireCouple = (user: User): string => {
  if (!user.coupleId) {
    throw new Error('You must be in a couple to perform this action');
  }
  return user.coupleId;
};

export const generateJWT = (user: User): string => {
  return jwt.sign(
    {
      sub: user.id,
      phone: user.phoneNumber,
      coupleId: user.coupleId,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '30d',
    }
  );
};

export const verifyJWT = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};