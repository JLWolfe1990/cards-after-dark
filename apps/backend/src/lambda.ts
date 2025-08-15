import serverless from 'serverless-http';
import { Application } from 'express';
import { startServer } from './server';

// Initialize Apollo Server
let serverPromise: Promise<{ app: Application }> | null = null;

export const handler = async (event: any, context: any) => {
  // Only initialize once
  if (!serverPromise) {
    serverPromise = startServer();
  }
  
  const { app } = await serverPromise;
  const handler = serverless(app, {
    binary: false,
  });
  
  return handler(event, context);
};