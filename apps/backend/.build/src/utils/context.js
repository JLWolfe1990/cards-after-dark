"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../services/database");
const pubsub_1 = require("./pubsub");
// AWS service instances
const dynamodb = new aws_sdk_1.default.DynamoDB.DocumentClient();
const cognito = new aws_sdk_1.default.CognitoIdentityServiceProvider();
const bedrock = new aws_sdk_1.default.BedrockRuntime();
const sns = new aws_sdk_1.default.SNS();
const createContext = async ({ req }) => {
    let user;
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            // Verify JWT token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Get user from database
            user = await (0, database_1.getUserById)(decoded.sub, dynamodb);
            if (!user) {
                console.warn('Token valid but user not found:', decoded.sub);
            }
        }
        catch (error) {
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
        pubsub: pubsub_1.pubsub,
    };
};
exports.createContext = createContext;
//# sourceMappingURL=context.js.map