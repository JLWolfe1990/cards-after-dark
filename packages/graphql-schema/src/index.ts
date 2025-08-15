import { readFileSync } from 'fs';
import { join } from 'path';

// Load the GraphQL schema
export const typeDefs = readFileSync(
  join(__dirname, 'schema', 'schema.graphql'), 
  'utf-8'
);

// Re-export types from shared package
export * from '@cards-after-dark/shared';