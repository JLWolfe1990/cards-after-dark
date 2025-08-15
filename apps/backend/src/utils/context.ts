import { Request } from 'express';
import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import { User } from '@cards-after-dark/shared';
import { getUserById } from '../services/database';
import { pubsub } from './pubsub';

// AWS service instances
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const bedrock = new AWS.BedrockRuntime();
const sns = new AWS.SNS();

export interface Context {
  user?: User;
  dynamodb: AWS.DynamoDB.DocumentClient;
  cognito: AWS.CognitoIdentityServiceProvider;
  bedrock: AWS.BedrockRuntime;
  sns: AWS.SNS;
  pubsub: any;
}

export const createContext = async ({ req }: { req: Request }): Promise<Context> => {
  let user: User | undefined;

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Get user from database
      user = await getUserById(decoded.sub, dynamodb);
      
      if (!user) {
        console.warn('Token valid but user not found:', decoded.sub);
      }
    } catch (error: any) {
      console.warn('Invalid JWT token:', error?.message || error);
      // Don't throw error, just continue without user
    }
  }

  return {
    user,
    dynamodb,
    cognito,
    bedrock,
    sns,
    pubsub,
  };
};