import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: Config.GRAPHQL_ENDPOINT || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev/graphql',
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: Config.GRAPHQL_WS_ENDPOINT || 'wss://your-ws-endpoint.execute-api.us-east-1.amazonaws.com/dev',
    connectionParams: async () => {
      const token = await AsyncStorage.getItem('auth_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  })
);

// Auth link to add JWT token to requests
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('auth_token');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Split link: use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          gameHistory: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
      GameSession: {
        fields: {
          userCards: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
          votes: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});