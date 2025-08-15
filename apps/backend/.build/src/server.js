"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const graphql_schema_1 = require("@cards-after-dark/graphql-schema");
const resolvers_1 = __importDefault(require("./resolvers"));
const context_1 = require("./utils/context");
// Configure AWS
aws_sdk_1.default.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
// Enable CORS
app.use((0, cors_1.default)({
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
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: graphql_schema_1.typeDefs,
    resolvers: resolvers_1.default,
    context: context_1.createContext,
    introspection: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV === 'development',
});
exports.server = server;
// Function to start the server
const startServer = async () => {
    await server.start();
    server.applyMiddleware({
        app: app,
        path: '/graphql',
        cors: false, // CORS already configured above
    });
    const httpServer = (0, http_1.createServer)(app);
    return { app, httpServer, server };
};
exports.startServer = startServer;
//# sourceMappingURL=server.js.map