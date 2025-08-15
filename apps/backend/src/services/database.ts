import AWS from 'aws-sdk';
import { 
  User, 
  CoupleProfile, 
  GameSession, 
  Rating, 
  Invitation, 
  VerificationSession,
  DrawnCard,
  Vote,
  generateId,
  formatDate 
} from '@cards-after-dark/shared';

const getTableName = (baseName: string): string => {
  const stage = process.env.STAGE || 'dev';
  return `CardsAfterDark-${baseName}-${stage}`;
};

// User operations
export const createUser = async (
  userData: Omit<User, 'id' | 'createdAt' | 'isVerified'>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<User> => {
  const user: User = {
    id: generateId('user'),
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

export const getUserById = async (
  userId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<User | undefined> => {
  const result = await dynamodb.get({
    TableName: getTableName('Users'),
    Key: { id: userId },
  }).promise();

  return result.Item as User | undefined;
};

export const getUserByPhone = async (
  phoneNumber: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<User | null> => {
  const result = await dynamodb.query({
    TableName: getTableName('Users'),
    IndexName: 'PhoneIndex',
    KeyConditionExpression: 'phoneNumber = :phone',
    ExpressionAttributeValues: {
      ':phone': phoneNumber,
    },
  }).promise();

  return (result.Items?.[0] as User) || null;
};

export const updateUser = async (
  userId: string,
  updates: Partial<User>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<User> => {
  const updateExpression = Object.keys(updates)
    .map(key => `#${key} = :${key}`)
    .join(', ');

  const expressionAttributeNames = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});

  const expressionAttributeValues = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key as keyof User] }), {});

  const result = await dynamodb.update({
    TableName: getTableName('Users'),
    Key: { id: userId },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }).promise();

  return result.Attributes as User;
};

// Couple operations
export const createCouple = async (
  user1Id: string,
  user2Id: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<CoupleProfile> => {
  const couple: CoupleProfile = {
    id: generateId('couple'),
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
    updateUser(user1Id, { coupleId: couple.id }, dynamodb),
    updateUser(user2Id, { coupleId: couple.id }, dynamodb),
  ]);

  return couple;
};

export const getCoupleById = async (
  coupleId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<CoupleProfile | null> => {
  const result = await dynamodb.get({
    TableName: getTableName('Couples'),
    Key: { id: coupleId },
  }).promise();

  if (!result.Item) return null;

  const coupleData = result.Item as any;
  
  // Get users
  const users = await Promise.all(
    coupleData.userIds.map((userId: string) => getUserById(userId, dynamodb))
  );

  return {
    ...coupleData,
    users: users.filter(Boolean) as User[],
  } as CoupleProfile;
};

export const getCoupleByUserId = async (
  userId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<CoupleProfile | null> => {
  const user = await getUserById(userId, dynamodb);
  if (!user?.coupleId) return null;
  
  return getCoupleById(user.coupleId, dynamodb);
};

export const updateCouple = async (
  coupleId: string,
  updates: Partial<CoupleProfile>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<CoupleProfile> => {
  const updateExpression = Object.keys(updates)
    .filter(key => key !== 'users') // Don't update users array directly
    .map(key => `#${key} = :${key}`)
    .join(', ');

  const expressionAttributeNames = Object.keys(updates)
    .filter(key => key !== 'users')
    .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});

  const expressionAttributeValues = Object.keys(updates)
    .filter(key => key !== 'users')
    .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key as keyof CoupleProfile] }), {});

  await dynamodb.update({
    TableName: getTableName('Couples'),
    Key: { id: coupleId },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }).promise();

  return getCoupleById(coupleId, dynamodb) as Promise<CoupleProfile>;
};

// Game session operations
export const createGameSession = async (
  coupleId: string,
  date: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<GameSession> => {
  const session: GameSession = {
    id: generateId('session'),
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

export const getGameSession = async (
  coupleId: string,
  date: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<GameSession | null> => {
  const result = await dynamodb.get({
    TableName: getTableName('GameSessions'),
    Key: { coupleId, date },
  }).promise();

  return (result.Item as GameSession) || null;
};

export const getCurrentGameSession = async (
  coupleId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<GameSession> => {
  const today = formatDate(new Date());
  let session = await getGameSession(coupleId, today, dynamodb);
  
  if (!session) {
    session = await createGameSession(coupleId, today, dynamodb);
  }
  
  return session;
};

export const updateGameSession = async (
  coupleId: string,
  date: string,
  updates: Partial<GameSession>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<GameSession> => {
  const updateExpression = Object.keys(updates)
    .map(key => `#${key} = :${key}`)
    .join(', ');

  const expressionAttributeNames = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});

  const expressionAttributeValues = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key as keyof GameSession] }), {});

  await dynamodb.update({
    TableName: getTableName('GameSessions'),
    Key: { coupleId, date },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }).promise();

  return getGameSession(coupleId, date, dynamodb) as Promise<GameSession>;
};

export const getGameHistory = async (
  coupleId: string,
  limit: number = 20,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<GameSession[]> => {
  const result = await dynamodb.query({
    TableName: getTableName('GameSessions'),
    KeyConditionExpression: 'coupleId = :coupleId',
    ExpressionAttributeValues: {
      ':coupleId': coupleId,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }).promise();

  return (result.Items as GameSession[]) || [];
};

// Rating operations
export const createRating = async (
  rating: Omit<Rating, 'createdAt'>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Rating> => {
  const newRating: Rating = {
    ...rating,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.put({
    TableName: getTableName('Ratings'),
    Item: newRating,
  }).promise();

  return newRating;
};

export const getRating = async (
  userId: string,
  cardId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Rating | null> => {
  const result = await dynamodb.get({
    TableName: getTableName('Ratings'),
    Key: { userId, cardId },
  }).promise();

  return (result.Item as Rating) || null;
};

export const getUserRatings = async (
  userId: string,
  limit: number = 50,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Rating[]> => {
  const result = await dynamodb.query({
    TableName: getTableName('Ratings'),
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false,
    Limit: limit,
  }).promise();

  return (result.Items as Rating[]) || [];
};

export const updateRating = async (
  userId: string,
  cardId: string,
  rating: number,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Rating> => {
  const updatedRating: Rating = {
    userId,
    cardId,
    rating: rating as 1 | 2 | 3 | 4 | 5,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.put({
    TableName: getTableName('Ratings'),
    Item: updatedRating,
  }).promise();

  return updatedRating;
};

// Verification session operations
export const createVerificationSession = async (
  sessionData: Omit<VerificationSession, 'attempts'>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<VerificationSession> => {
  const session: VerificationSession = {
    ...sessionData,
    attempts: 0,
  };

  await dynamodb.put({
    TableName: getTableName('VerificationSessions'),
    Item: session,
  }).promise();

  return session;
};

export const getVerificationSession = async (
  sessionId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<VerificationSession | null> => {
  const result = await dynamodb.get({
    TableName: getTableName('VerificationSessions'),
    Key: { sessionId },
  }).promise();

  return (result.Item as VerificationSession) || null;
};

export const updateVerificationSession = async (
  sessionId: string,
  updates: Partial<VerificationSession>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<void> => {
  const updateExpression = Object.keys(updates)
    .map(key => `#${key} = :${key}`)
    .join(', ');

  const expressionAttributeNames = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});

  const expressionAttributeValues = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key as keyof VerificationSession] }), {});

  await dynamodb.update({
    TableName: getTableName('VerificationSessions'),
    Key: { sessionId },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }).promise();
};

// Invitation operations
export const createInvitation = async (
  invitationData: Omit<Invitation, 'id' | 'sentAt' | 'status'>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Invitation> => {
  const invitation: Invitation = {
    id: generateId('invitation'),
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

export const getInvitationById = async (
  invitationId: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Invitation | null> => {
  const result = await dynamodb.get({
    TableName: getTableName('Invitations'),
    Key: { id: invitationId },
  }).promise();

  return (result.Item as Invitation) || null;
};

export const getInvitationByPhone = async (
  phoneNumber: string,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Invitation | null> => {
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

  return (result.Items?.[0] as Invitation) || null;
};

export const updateInvitation = async (
  invitationId: string,
  updates: Partial<Invitation>,
  dynamodb: AWS.DynamoDB.DocumentClient
): Promise<Invitation> => {
  const updateExpression = Object.keys(updates)
    .map(key => `#${key} = :${key}`)
    .join(', ');

  const expressionAttributeNames = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});

  const expressionAttributeValues = Object.keys(updates)
    .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key as keyof Invitation] }), {});

  const result = await dynamodb.update({
    TableName: getTableName('Invitations'),
    Key: { id: invitationId },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }).promise();

  return result.Attributes as Invitation;
};