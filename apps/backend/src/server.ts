import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import cors from 'cors';
import AWS from 'aws-sdk';

import { typeDefs } from '@cards-after-dark/graphql-schema';
import resolvers from './resolvers';
import { createContext } from './utils/context';

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create Express app
const app: Application = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://cards-after-dark.com'] 
    : true,
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
  introspection: process.env.NODE_ENV !== 'production',
  debug: process.env.NODE_ENV === 'development',
});

// Function to start the server
export const startServer = async () => {
  await server.start();
  server.applyMiddleware({ 
    app: app as any, 
    path: '/graphql',
    cors: false, // CORS already configured above
  });

  const httpServer = createServer(app);
  return { app, httpServer, server };
};

export { app, server };