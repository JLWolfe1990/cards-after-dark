"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = exports.generateJWT = exports.requireCouple = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const apollo_server_express_1 = require("apollo-server-express");
const requireAuth = (context) => {
    if (!context.user) {
        throw new apollo_server_express_1.AuthenticationError('You must be logged in to perform this action');
    }
    return context.user;
};
exports.requireAuth = requireAuth;
const requireCouple = (user) => {
    if (!user.coupleId) {
        throw new Error('You must be in a couple to perform this action');
    }
    return user.coupleId;
};
exports.requireCouple = requireCouple;
const generateJWT = (user) => {
    return jsonwebtoken_1.default.sign({
        sub: user.id,
        phone: user.phoneNumber,
        coupleId: user.coupleId,
    }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};
exports.generateJWT = generateJWT;
const verifyJWT = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch (error) {
        throw new apollo_server_express_1.AuthenticationError('Invalid or expired token');
    }
};
exports.verifyJWT = verifyJWT;
//# sourceMappingURL=auth.js.map