"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInvitation = exports.getInvitationByPhone = exports.getInvitationById = exports.createInvitation = exports.updateVerificationSession = exports.getVerificationSession = exports.createVerificationSession = exports.updateRating = exports.getUserRatings = exports.getRating = exports.createRating = exports.getGameHistory = exports.updateGameSession = exports.getCurrentGameSession = exports.getGameSession = exports.createGameSession = exports.updateCouple = exports.getCoupleByUserId = exports.getCoupleById = exports.createCouple = exports.updateUser = exports.getUserByPhone = exports.getUserById = exports.createUser = void 0;
const shared_1 = require("@cards-after-dark/shared");
const getTableName = (baseName) => {
    const stage = process.env.STAGE || 'dev';
    return `CardsAfterDark-${baseName}-${stage}`;
};
// User operations
const createUser = async (userData, dynamodb) => {
    const user = {
        id: (0, shared_1.generateId)('user'),
        ...userData,
        isVerified: false,
        createdAt: new Date().toISOString(),
    };
    await dynamodb.put({
        TableName: getTableName('Users'),
        Item: user,
    }).promise();
    return user;
};
exports.createUser = createUser;
const getUserById = async (userId, dynamodb) => {
    const result = await dynamodb.get({
        TableName: getTableName('Users'),
        Key: { id: userId },
    }).promise();
    return result.Item;
};
exports.getUserById = getUserById;
const getUserByPhone = async (phoneNumber, dynamodb) => {
    const result = await dynamodb.query({
        TableName: getTableName('Users'),
        IndexName: 'PhoneIndex',
        KeyConditionExpression: 'phoneNumber = :phone',
        ExpressionAttributeValues: {
            ':phone': phoneNumber,
        },
    }).promise();
    return result.Items?.[0] || null;
};
exports.getUserByPhone = getUserByPhone;
const updateUser = async (userId, updates, dynamodb) => {
    const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(', ');
    const expressionAttributeNames = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
    const expressionAttributeValues = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key] }), {});
    const result = await dynamodb.update({
        TableName: getTableName('Users'),
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }).promise();
    return result.Attributes;
};
exports.updateUser = updateUser;
// Couple operations
const createCouple = async (user1Id, user2Id, dynamodb) => {
    const couple = {
        id: (0, shared_1.generateId)('couple'),
        users: [], // Will be populated when queried
        totalPoints: 0,
        level: 1,
        streakDays: 0,
        createdAt: new Date().toISOString(),
    };
    // Create couple record
    await dynamodb.put({
        TableName: getTableName('Couples'),
        Item: {
            ...couple,
            userIds: [user1Id, user2Id],
        },
    }).promise();
    // Update both users with couple reference
    await Promise.all([
        (0, exports.updateUser)(user1Id, { coupleId: couple.id }, dynamodb),
        (0, exports.updateUser)(user2Id, { coupleId: couple.id }, dynamodb),
    ]);
    return couple;
};
exports.createCouple = createCouple;
const getCoupleById = async (coupleId, dynamodb) => {
    const result = await dynamodb.get({
        TableName: getTableName('Couples'),
        Key: { id: coupleId },
    }).promise();
    if (!result.Item)
        return null;
    const coupleData = result.Item;
    // Get users
    const users = await Promise.all(coupleData.userIds.map((userId) => (0, exports.getUserById)(userId, dynamodb)));
    return {
        ...coupleData,
        users: users.filter(Boolean),
    };
};
exports.getCoupleById = getCoupleById;
const getCoupleByUserId = async (userId, dynamodb) => {
    const user = await (0, exports.getUserById)(userId, dynamodb);
    if (!user?.coupleId)
        return null;
    return (0, exports.getCoupleById)(user.coupleId, dynamodb);
};
exports.getCoupleByUserId = getCoupleByUserId;
const updateCouple = async (coupleId, updates, dynamodb) => {
    const updateExpression = Object.keys(updates)
        .filter(key => key !== 'users') // Don't update users array directly
        .map(key => `#${key} = :${key}`)
        .join(', ');
    const expressionAttributeNames = Object.keys(updates)
        .filter(key => key !== 'users')
        .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
    const expressionAttributeValues = Object.keys(updates)
        .filter(key => key !== 'users')
        .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key] }), {});
    await dynamodb.update({
        TableName: getTableName('Couples'),
        Key: { id: coupleId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
    }).promise();
    return (0, exports.getCoupleById)(coupleId, dynamodb);
};
exports.updateCouple = updateCouple;
// Game session operations
const createGameSession = async (coupleId, date, dynamodb) => {
    const session = {
        id: (0, shared_1.generateId)('session'),
        coupleId,
        date,
        userCards: [],
        votes: [],
        completed: false,
        points: 0,
        status: 'waiting',
        createdAt: new Date().toISOString(),
    };
    await dynamodb.put({
        TableName: getTableName('GameSessions'),
        Item: session,
    }).promise();
    return session;
};
exports.createGameSession = createGameSession;
const getGameSession = async (coupleId, date, dynamodb) => {
    const result = await dynamodb.get({
        TableName: getTableName('GameSessions'),
        Key: { coupleId, date },
    }).promise();
    return result.Item || null;
};
exports.getGameSession = getGameSession;
const getCurrentGameSession = async (coupleId, dynamodb) => {
    const today = (0, shared_1.formatDate)(new Date());
    let session = await (0, exports.getGameSession)(coupleId, today, dynamodb);
    if (!session) {
        session = await (0, exports.createGameSession)(coupleId, today, dynamodb);
    }
    return session;
};
exports.getCurrentGameSession = getCurrentGameSession;
const updateGameSession = async (coupleId, date, updates, dynamodb) => {
    const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(', ');
    const expressionAttributeNames = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
    const expressionAttributeValues = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key] }), {});
    await dynamodb.update({
        TableName: getTableName('GameSessions'),
        Key: { coupleId, date },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
    }).promise();
    return (0, exports.getGameSession)(coupleId, date, dynamodb);
};
exports.updateGameSession = updateGameSession;
const getGameHistory = async (coupleId, limit = 20, dynamodb) => {
    const result = await dynamodb.query({
        TableName: getTableName('GameSessions'),
        KeyConditionExpression: 'coupleId = :coupleId',
        ExpressionAttributeValues: {
            ':coupleId': coupleId,
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
    }).promise();
    return result.Items || [];
};
exports.getGameHistory = getGameHistory;
// Rating operations
const createRating = async (rating, dynamodb) => {
    const newRating = {
        ...rating,
        createdAt: new Date().toISOString(),
    };
    await dynamodb.put({
        TableName: getTableName('Ratings'),
        Item: newRating,
    }).promise();
    return newRating;
};
exports.createRating = createRating;
const getRating = async (userId, cardId, dynamodb) => {
    const result = await dynamodb.get({
        TableName: getTableName('Ratings'),
        Key: { userId, cardId },
    }).promise();
    return result.Item || null;
};
exports.getRating = getRating;
const getUserRatings = async (userId, limit = 50, dynamodb) => {
    const result = await dynamodb.query({
        TableName: getTableName('Ratings'),
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
        ScanIndexForward: false,
        Limit: limit,
    }).promise();
    return result.Items || [];
};
exports.getUserRatings = getUserRatings;
const updateRating = async (userId, cardId, rating, dynamodb) => {
    const updatedRating = {
        userId,
        cardId,
        rating: rating,
        createdAt: new Date().toISOString(),
    };
    await dynamodb.put({
        TableName: getTableName('Ratings'),
        Item: updatedRating,
    }).promise();
    return updatedRating;
};
exports.updateRating = updateRating;
// Verification session operations
const createVerificationSession = async (sessionData, dynamodb) => {
    const session = {
        ...sessionData,
        attempts: 0,
    };
    await dynamodb.put({
        TableName: getTableName('VerificationSessions'),
        Item: session,
    }).promise();
    return session;
};
exports.createVerificationSession = createVerificationSession;
const getVerificationSession = async (sessionId, dynamodb) => {
    const result = await dynamodb.get({
        TableName: getTableName('VerificationSessions'),
        Key: { sessionId },
    }).promise();
    return result.Item || null;
};
exports.getVerificationSession = getVerificationSession;
const updateVerificationSession = async (sessionId, updates, dynamodb) => {
    const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(', ');
    const expressionAttributeNames = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
    const expressionAttributeValues = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key] }), {});
    await dynamodb.update({
        TableName: getTableName('VerificationSessions'),
        Key: { sessionId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
    }).promise();
};
exports.updateVerificationSession = updateVerificationSession;
// Invitation operations
const createInvitation = async (invitationData, dynamodb) => {
    const invitation = {
        id: (0, shared_1.generateId)('invitation'),
        ...invitationData,
        status: 'sent',
        sentAt: new Date().toISOString(),
    };
    await dynamodb.put({
        TableName: getTableName('Invitations'),
        Item: invitation,
    }).promise();
    return invitation;
};
exports.createInvitation = createInvitation;
const getInvitationById = async (invitationId, dynamodb) => {
    const result = await dynamodb.get({
        TableName: getTableName('Invitations'),
        Key: { id: invitationId },
    }).promise();
    return result.Item || null;
};
exports.getInvitationById = getInvitationById;
const getInvitationByPhone = async (phoneNumber, dynamodb) => {
    const result = await dynamodb.query({
        TableName: getTableName('Invitations'),
        IndexName: 'PhoneIndex',
        KeyConditionExpression: 'phoneNumber = :phone',
        ExpressionAttributeValues: {
            ':phone': phoneNumber,
        },
        ScanIndexForward: false,
        Limit: 1,
    }).promise();
    return result.Items?.[0] || null;
};
exports.getInvitationByPhone = getInvitationByPhone;
const updateInvitation = async (invitationId, updates, dynamodb) => {
    const updateExpression = Object.keys(updates)
        .map(key => `#${key} = :${key}`)
        .join(', ');
    const expressionAttributeNames = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
    const expressionAttributeValues = Object.keys(updates)
        .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key] }), {});
    const result = await dynamodb.update({
        TableName: getTableName('Invitations'),
        Key: { id: invitationId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }).promise();
    return result.Attributes;
};
exports.updateInvitation = updateInvitation;
//# sourceMappingURL=database.js.map