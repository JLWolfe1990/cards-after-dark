"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_TOPICS = exports.pubsub = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
// Create a single PubSub instance for the entire application
exports.pubsub = new graphql_subscriptions_1.PubSub();
// Define subscription topics as constants
exports.SUBSCRIPTION_TOPICS = {
    PARTNER_CARD_DRAWN: 'PARTNER_CARD_DRAWN',
    PARTNER_VOTE: 'PARTNER_VOTE',
    VOTING_COMPLETE: 'VOTING_COMPLETE',
    ACTIVITY_COMPLETED: 'ACTIVITY_COMPLETED',
    INVITATION_RECEIVED: 'INVITATION_RECEIVED',
    INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
    NOTIFICATION: 'NOTIFICATION',
};
//# sourceMappingURL=pubsub.js.map