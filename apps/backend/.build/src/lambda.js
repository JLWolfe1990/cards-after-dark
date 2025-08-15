"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const serverless_http_1 = __importDefault(require("serverless-http"));
const server_1 = require("./server");
// Initialize Apollo Server
let serverPromise = null;
const handler = async (event, context) => {
    // Only initialize once
    if (!serverPromise) {
        serverPromise = (0, server_1.startServer)();
    }
    const { app } = await serverPromise;
    const handler = (0, serverless_http_1.default)(app, {
        binary: false,
    });
    return handler(event, context);
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map